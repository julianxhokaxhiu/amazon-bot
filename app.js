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
.onText(/\/echo (.+)/, function (msg, match) {
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});

bot
.on( 'inline_query', function ( message ){
  bot
  .answerInlineQuery( message.id, [] );
});