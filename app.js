// See http://stackoverflow.com/a/3291856
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}
// See https://github.com/yagop/node-telegram-bot-api
var TelegramBot = require('node-telegram-bot-api');

// See https://github.com/t3chnoboy/amazon-product-api
var amazon = require('amazon-product-api');

// See https://github.com/vkurchatkin/which-country
var wc = require('which-country');

// See https://github.com/louischatriot/nedb
var Datastore = require('nedb'),
    db = new Datastore({
      filename: 'datastore.db',
      autoload: true
    });

// List of supported Amazon endpoints
var amazonEndpoints = {
  'US' : 'webservices.amazon.com',
  'CA' : 'webservices.amazon.ca',
  'IT' : 'webservices.amazon.it',
  'DE' : 'webservices.amazon.de',
  'UK' : 'webservices.amazon.co.uk',
  'ES' : 'webservices.amazon.es',
  'FR' : 'webservices.amazon.fr'
};

// Telegram API Token
var token = process.env.TELEGRAM_API_TOKEN || '';

// Create the Bot
var bot = new TelegramBot(
  token,
  {
    webHook: {
      port: process.env.PORT || '3000'
    }
  }
);

// Listen on WebHooks
bot
.setWebHook(
  process.env.BASE_URL + '/' + process.env.WEBHOOK_TOKEN
);

// User is asking for help, or is geeting me for the first time
bot.onText(/\/help|\/start/, function (msg, match) {
  var chatId = msg.chat.id,
      resp = `
This Bot will help you to search your favourite Amazon products directly from here.
If you do not pass any {country code} into the inline query, a default assumption will be used.
Default fallback logic: location ( if available ) -> your setting ( if set ) -> US. The first that matches, is the winner.

You can control me by sending these commands:

-= COUNTRY OPTION =-
/set country={COUNTRY_CODE}
> Supported list: {cc_list}

This option will set your default country amoung all your chats. If you need to change it, just run this command again.

Example: >> /set country=CA <<
  `;

  resp = resp.replace('{cc_list}', Object.keys(amazonEndpoints).join(',') );

  bot.sendMessage(chatId, resp);
});

// Save user preferences...
bot.onText(/\/set (.+)/, function (msg, match) {
  var chatId = msg.chat.id,
      userId = msg.from.id,
      option = match[1];

  setUserOption( userId, option, function ( resp ){
    bot.sendMessage(chatId, resp);
  });
});

// Once the user is searching...
bot
.on( 'inline_query', function ( message ){
  getUserOptions( message.from.id, function (options) {
    answerUser( message, options );
  })
});

var answerUser = function ( message, userOptions ) {
  if ( message.query ) {
    // Get the country where to query
    var query = message.query.split('@')[0],
        country = ( message.query.split('@')[1] || '').toUpperCase();

    if ( !country ) {
      // Detect user country if provided
      if ( message.location ) {
        country = wc([
          message.location.latitude,
          message.location.longitude
        ]);
      }

      // Detect if user set a default, update only if not find by the location
      if ( !country && 'country' in userOptions ) {
        country = userOptions.country.toUpperCase();
      }

      // Force the Amazon.com search if no country given or detected
      if ( !country ) country = 'US';
    } else
      // Get only the first two letters and convert them to uppercase
      country = country.toUpperCase().substring(0,2)

    // If the country is given, always check if it's in the list
    if ( country in amazonEndpoints ) {

      // Create the Amazon Client
      var client = amazon.createClient({
        awsId: process.env.AMAZON_ACCESS_ID || '',
        awsSecret: process.env.AMAZON_SECRET_ACCESS_KEY || '',
        awsTag: process.env['AMAZON_ASSOCIATE_TAG_' + country] || ''
      });

      client
      .itemSearch(
        {
          keywords: query,
          searchIndex: 'All',
          responseGroup: 'Images,ItemAttributes,OfferSummary',
          domain: amazonEndpoints[ country ]
        },
        function (error, results) {
          if (error) {
            // Log the error
            console.log( error );
          } else {
            var answers = [],
                endpoint = amazonEndpoints[ country ].replace('webservices.','');

            for ( var k in results ) {
              var item = results[k],
                  id = coalesce( item, k, 'ASIN', 0 ),
                  price = coalesce( item, null, 'OfferSummary', 0, 'LowestNewPrice', 0, 'FormattedPrice', 0 ),
                  url = coalesce( item, 'https://' + endpoint, 'DetailPageURL', 0 ),
                  title = coalesce( item, 'No Title', 'ItemAttributes', 0, 'Title', 0 ),
                  imageUrl = coalesce( item, '', 'ImageSets', 0, 'ImageSet', 0, 'LargeImage', 0, 'URL', 0 ),
                  thumbUrl = coalesce( item, amazonEndpoints[ country ].replace('webservices.','https://'), 'ImageSets', 0, 'ImageSet', 0, 'SmallImage', 0, 'URL', 0 ),
                  thumbWidth = parseInt( coalesce( item, 0, 'ImageSets', 0, 'ImageSet', 0, 'SmallImage', 0, 'Width', 0, '_' ) ),
                  thumbHeight = parseInt( coalesce( item, 0, 'ImageSets', 0, 'ImageSet', 0, 'SmallImage', 0, 'Height', 0, '_' ) );

              answers
              .push(
                {
                  type: 'article',
                  id: id,
                  title: ( price ? '[' + price + ']' : '' ) + title,
                  input_message_content: {
                    message_text: title + ( price ? '\n\n<b>Lowest Price:</b> ' + price : '' ) + ( imageUrl ? '\n\n' + imageUrl : '' ),
                    parse_mode: 'HTML'
                  },
                  reply_markup: {
                    inline_keyboard: [
                      [{
                        text: 'Open in ' + endpoint.capitalize(),
                        url: url
                      }]
                    ],
                  },
                  url: url,
                  hide_url: false,
                  thumb_url: thumbUrl,
                  thumb_width: thumbWidth,
                  thumb_height: thumbHeight
                }
              );
            }

            bot
            .answerInlineQuery(
              message.id,
              answers
            );
          }
        }
      )
    }
  }
}

var coalesce = function ( arr, def ) {
    var i, max_i, ret = arr;

    for (i = 2, max_i = arguments.length; i < max_i; i++) {
        ret = ret[ arguments[i] ];
        if (ret === undefined) {
            ret = def;
            break;
        }
    }

    return ret;
}

var getUserOptions = function ( uid, cb ) {
  var ret = {};

  db
  .find(
    {
      userid: uid
    },
    function ( err, docs ) {
      if (!err)
        ret = docs[0];

      cb(ret);
    }
  )
}

var setUserOption = function ( uid, option, cb ) {
  var ret = 'Success! Option updated. /help',
      userOptions = {
        userid: uid
      },
      option = ( option ? option.split('=') : [] );

  if ( option.length == 2 ) {
    var key = option[0],
        value = ( option[1] ? option[1] : '' );

    userOptions[ key.toLowerCase() ] = value;

    db
    .update(
      {
        userid: uid,
      },
      userOptions,
      {
        upsert: true,
      },
      function (err, newDoc) {
        if (err)
          ret = 'Something went wrong. Please retry later. /help';

        cb(ret);
      }
    )
  } else {
    ret = 'Fail! Option syntax is not valid. /help';
    cb(ret);
  }
}