// See https://github.com/yagop/node-telegram-bot-api
var TelegramBot = require('node-telegram-bot-api');

// See https://github.com/t3chnoboy/amazon-product-api
var amazon = require('amazon-product-api');

// See https://github.com/vkurchatkin/which-country
var wc = require('which-country');

// See https://github.com/kemitchell/markdown-escape.js
var markdownEscape = require('markdown-escape')

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

// Once the user is searching...
bot
.on( 'inline_query', function ( message ){
  if ( message.query ) {
    // Get the country where to query
    var query = message.query.split('@')[0],
        country = ( message.query.split('@')[1] || '').toUpperCase();

    // Detect user country if not provided
    if ( message.location ) {
      country = wc([
        message.location.latitude,
        message.location.longitude
      ]);
    }

    if ( !country )
      // Force the Amazon.com search if no country given or detected
      country = 'US';
    else
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

      client.itemSearch(
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
            // Craft error message
            answerUser(
              message,
              [{
                type: 'article',
                id: '000',
                title: 'Query error. Please retry with something different.',
                input_message_content: {
                  message_text: ''
                },
                url: '',
                hide_url: true,
                thumb_url: '',
                thumb_width: 64,
                thumb_height: 64
              }]
            )
          } else {
            var answers = [];

            for ( var k in results ) {
              var item = results[k],
                  id = coalesce( item, k, 'ASIN', 0 ),
                  price = coalesce( item, null, 'OfferSummary', 0, 'LowestNewPrice', 0, 'FormattedPrice', 0 ),
                  price = ( price ? '[' + price + ']' : '' ),
                  url = coalesce( item, amazonEndpoints[ country ].replace('webservices.','https://'), 'DetailPageURL', 0 ),
                  title = coalesce( item, 'No Title', 'ItemAttributes', 0, 'Title', 0 ),
                  imageUrl = coalesce( item, amazonEndpoints[ country ].replace('webservices.','https://'), 'ImageSets', 0, 'ImageSet', 0, 'SmallImage', 0, 'URL', 0 ),
                  largeImageUrl = coalesce( item, amazonEndpoints[ country ].replace('webservices.','https://'), 'ImageSets', 0, 'ImageSet', 0, 'LargeImage', 0, 'URL', 0 ),
                  imageWidth = parseInt( coalesce( item, 0, 'ImageSets', 0, 'ImageSet', 0, 'SmallImage', 0, 'Width', 0, '_' ) ),
                  imageHeight = parseInt( coalesce( item, 0, 'ImageSets', 0, 'ImageSet', 0, 'SmallImage', 0, 'Height', 0, '_' ) );

              answers
              .push(
                {
                  type: 'article',
                  id: id,
                  title: price + title,
                  input_message_content: {
                    message_text: '[' + markdownEscape(title) + '](' + url + ')' + ( price ? '\n\n*Lowest Price:* ' + price : '' ) + ( largeImageUrl ? '\n\n*Large Image:* ' + largeImageUrl : '' ),
                    parse_mode: 'Markdown'
                  },
                  url: url,
                  hide_url: false,
                  thumb_url: imageUrl,
                  thumb_width: imageWidth,
                  thumb_height: imageHeight
                }
              );
            }

            answerUser(
              message,
              answers
            )
          }
        }
      )
    } else {
      // Craft unsupported message
      answerUser(
        message,
        [{
          type: 'article',
          id: '000',
          title: 'Unsupported country',
          input_message_content: {
            message_text: ''
          },
          url: '',
          hide_url: true,
          thumb_url: '',
          thumb_width: 64,
          thumb_height: 64
        }]
      )
    }
  }
});

var answerUser = function ( message, answer ) {
  // Craft answer
  bot
  .answerInlineQuery(
    message.id,
    answer
  );
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