// See https://github.com/yagop/node-telegram-bot-api
var TelegramBot = require('node-telegram-bot-api');

// See https://github.com/t3chnoboy/amazon-product-api
var amazon = require('amazon-product-api');

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

    // Force the Amazon.com search if no country given
    if ( !country ) country = 'US';

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
            // Craft error message
            answerUser(
              message,
              [{
                type: 'article',
                id: '000',
                title: 'Unknown Error',
                input_message_content: {
                  message_text: "Sorry, something bad happened. Please try later :("
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
              var item = results[k];

              answers
              .push(
                {
                  type: 'article',
                  id: item.ASIN[0],
                  title: '[' + item.OfferSummary[0].LowestNewPrice[0].FormattedPrice[0] + '] ' + item.ItemAttributes[0].Title[0],
                  input_message_content: {
                    message_text: item.ItemAttributes[0].Title[0] + '\n\n*Lowest Price:* ' + item.OfferSummary[0].LowestNewPrice[0].FormattedPrice[0] + '\n[See Article](' + item.DetailPageURL[0] + ')',
                    parse_mode: 'Markdown'
                  },
                  url: item.DetailPageURL[0],
                  hide_url: false,
                  thumb_url: item.ImageSets[0].ImageSet[0].SmallImage[0].URL[0],
                  thumb_width: parseInt( item.ImageSets[0].ImageSet[0].SmallImage[0].Width[0]['_'] ),
                  thumb_height: parseInt( item.ImageSets[0].ImageSet[0].SmallImage[0].Height[0]['_'] )
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
            message_text: "Sorry, I do not support the country you're asking for :("
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