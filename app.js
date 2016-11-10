// See https://github.com/yagop/node-telegram-bot-api
var TelegramBot = require('node-telegram-bot-api');
// See https://github.com/t3chnoboy/amazon-product-api
var amazon = require('amazon-product-api');

var client = amazon.createClient({
  awsId: process.env.AMAZON_AWS_ID || '',
  awsSecret: process.env.AMAZON_AWS_SECRET || '',
  awsTag: process.env.AMAZON_AWS_TAG || ''
});

var token = process.env.TELEGRAM_API_TOKEN || '';

var bot = new TelegramBot(
  token,
  {
    webHook: {
      port: process.env.PORT || '3000'
    }
  }
);

bot
.setWebHook(
  process.env.BASE_URL + '/' + process.env.WEBHOOK_TOKEN
);

bot
.on( 'inline_query', function ( message ){
  bot
  .answerInlineQuery(
    message.id,
    [{
      type: 'article',
      id: '001',
      title: 'Lorem ipsum',
      input_message_content: {
        message_text: 'Lorem ipsum dolor sit amet'
      },
      url: 'http://www.lipsum.com/',
      hide_url: true,
      thumb_url: 'https://telegram.org/img/t_logo.png',
      thumb_width: '64',
      thumb_height: '64'
    }]
  );
});