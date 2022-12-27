/* jshint esversion: 8 */
/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const i18n = require('i18next');

// Read in the APL documents for use in handlers
const mainDisplay = require('./display/main.json');

// Tokens used when sending the APL directives
const HELLO_WORLD_TOKEN = 'helloworldToken';

const factsData = require('./factsData.js');

// const supportedLanguages = {
//   'en'    : {code:'en', name:'English', nameLocalised:'English'},
//   'hi'    : {code:'hi', name:'Hindi',   nameLocalised:'Hindi'},
//   'ur'    : {code:'ur', name:'Urdu',    nameLocalised:'Urdu'}
// };

const languageStrings = {
  'en'    : require('./i18n/en'),
  // 'en-IN' : require('./i18n/en-IN'),
  // 'en-US' : require('./i18n/en-US'),
  'hi'    : require('./i18n/hi'),
  'ur'    : require('./i18n/ur'),
};

const LocalizationInterceptor = {
  process(handlerInput) {
    //console.log('LocalizationInterceptor: ');
    // Gets the locale from the request and initializes i18next.
    const localizationClient = i18n.init({
      lng: handlerInput.requestEnvelope.request.locale,
      fallbackLng: 'en', // fallback to EN if locale doesn't exist
      resources: languageStrings,
      returnObjects: true,
      // interpolation: {
      //   format: function(value, format, lng) {
      //     if(value instanceof moment) return moment(value).format(format);
      //     return value;
      //   }
      // }
    });

    localizationClient.localize = function (...args) {
      const localizedStrings = i18n.t(...args);

      if (Array.isArray(localizedStrings)) {
        return localizedStrings[Math.floor(Math.random() * localizedStrings.length)];
      } else {
        return localizedStrings;
      }
    };
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

    requestAttributes.t = function (...args) { // pass on arguments to the localizationClient
      return localizationClient.localize(...args);
    };
  }
};


const GetNewFactHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return request.type === 'LaunchRequest'
    || (request.type === 'IntentRequest'
    && (request.intent.name === 'GetNewFactIntent' | sessionAttributes.handleFlow));
  },
  handle(handlerInput) {
    let fact = getRandomFact(handlerInput);
    return displayFact(handlerInput, fact);

    // if(handlerInput.requestEnvelope.request.type === 'LaunchRequest')
    //   getRandomFact(handlerInput);
    //
    // const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    // let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // let response = getFactResponse(sessionAttributes.curFact);
    //
    // if (supportsDisplay(handlerInput) ) {
    //   let imgIndex = Math.floor(Math.random() * factsData.images.length);
    //   const image = new Alexa.ImageHelper()
    //   .addImageInstance(factsData.images[imgIndex])
    //   .getImage();
    //
    //   const primaryText = new Alexa.RichTextContentHelper()
    //   .withPrimaryText(response.text)
    //   .getTextContent();
    //
    //   handlerInput.responseBuilder.addRenderTemplateDirective({
    //     type: 'BodyTemplate1',
    //     token: 'string',
    //     backButton: 'HIDDEN',
    //     backgroundImage: image,
    //     title: response.title,
    //     textContent: primaryText,
    //   });
    // }
    //
    // sessionAttributes.handleFlow = false;
    // handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    //
    // return handlerInput.responseBuilder
    // .speak(response.say + ' ' + randomArrayElement(REPROMPT_TEXT))
    // .reprompt(randomArrayElement(REPROMPT_TEXT))
    // .withStandardCard(response.title, response.cardText, welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
    // //.withShouldEndSession(true)
    // .getResponse();
  },
};

const displayFact = (handlerInput, fact) => {

  // if (supportsDisplay(handlerInput) ) {
  //   //let imgIndex = Math.floor(Math.random() * factsData.images.length);
  //   const image = new Alexa.ImageHelper()
  //   .addImageInstance(fact.image)
  //   .getImage();

  //   const primaryText = new Alexa.RichTextContentHelper()
  //   .withPrimaryText(fact.text)
  //   .getTextContent();

  //   // handlerInput.responseBuilder.addRenderTemplateDirective({
  //   //   type: 'BodyTemplate1',
  //   //   token: 'string',
  //   //   backButton: 'HIDDEN',
  //   //   backgroundImage: image,
  //   //   title: fact.title,
  //   //   textContent: primaryText,
  //   // });

  //   if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']){
  //     handlerInput.responseBuilder.addDirective({
  //       type: 'Alexa.Presentation.APL.RenderDocument',
  //       token: HELLO_WORLD_TOKEN,
  //       document: mainDisplay
  //     });
  //   }
  // }

  if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']){
    handlerInput.responseBuilder.addDirective({
      type: 'Alexa.Presentation.APL.RenderDocument',
      token: HELLO_WORLD_TOKEN,
      document: mainDisplay,
      datasources: {
        "headlineTemplateData": {
            "type": "object",
            "objectId": "headlineSample",
            "properties": {
                "backgroundImage": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": fact.image,
                            "size": "large"
                        }
                    ]
                },
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": truncate(fact.text, 50),
                        maxLines: 3
                    },
                    "secondaryText": {
                      "type": "PlainText",
                      "text": fact.title
                  }
                },
                "logoUrl": "https://quran-facts.s3.amazonaws.com/QuranFactsLogoSmall.png",
                "hintText": "Try, \"Alexa, what is the Quran fact of the day?\"",
                // "welcomeSpeechSSML": "<speak><amazon:emotion name='excited' intensity='medium'>Welcome to The Daily Plant Facts</amazon:emotion></speak>"
            },
            // "transformers": [
            //     {
            //         "inputPath": "welcomeSpeechSSML",
            //         "transformer": "ssmlToSpeech",
            //         "outputName": "welcomeSpeech"
            //     }
            // ]
        }
      }
    });
  }

  return handlerInput.responseBuilder
  .speak(fact.response +' <break time="2s"/>'+fact.reprompt)
  .reprompt(fact.reprompt)
  .withStandardCard(fact.title, fact.text, welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
  //.withShouldEndSession(true)
  .getResponse();

};

const NextHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && (request.intent.name === 'AMAZON.NextIntent'
        || request.intent.name === 'AMAZON.MoreIntent'
        || request.intent.name === 'AMAZON.YesIntent');
  },
  handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let fact;
    if((sessionAttributes.history.length-1)>sessionAttributes.curIndex){
      sessionAttributes.curIndex++;
      fact = sessionAttributes.history[sessionAttributes.curIndex];
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    } else{
      fact = getRandomFact(handlerInput);
    }

    console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
    return displayFact(handlerInput, fact);
  }
};

const PreviousHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && request.intent.name === 'AMAZON.PreviousIntent';
  },
  handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.curIndex--;
    if(sessionAttributes.curIndex<0)
      sessionAttributes.curIndex--;
    let fact = sessionAttributes.history[sessionAttributes.curIndex];
    console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
    return displayFact(handlerInput, fact);
  }
};

const RepeatHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && request.intent.name === 'AMAZON.RepeatIntent';
  },
  handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
    let fact = sessionAttributes.history[sessionAttributes.curIndex];
    return displayFact(handlerInput, fact);
  },
};

// const YesHandler = {
//   canHandle(handlerInput) {
//     const request = handlerInput.requestEnvelope.request;
//     return request.type === 'IntentRequest'
//     && request.intent.name === 'AMAZON.YesIntent';
//   },
//   handle(handlerInput) {
//     let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
//     sessionAttributes.curIndex++;
//     getRandomFact(handlerInput);
//     sessionAttributes.handleFlow = true;
//     handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
//     return GetNewFactHandler.handle(handlerInput);
//   }
// };

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
    .speak(requestAttributes.t('HELP'))
    .reprompt(requestAttributes.t('HELP_REPROMPT'))
    .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && (request.intent.name === 'AMAZON.CancelIntent'
    || request.intent.name === 'AMAZON.StopIntent'
    || request.intent.name === 'AMAZON.NoIntent');
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
    .speak(requestAttributes.t('STOP'))
    .withShouldEndSession(true)
    .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
    .speak(requestAttributes.t('ERROR'))
    //.reprompt(requestAttributes.t('ERROR'))
    .getResponse();
  },
};

function truncate(str, n){
  return (str.length > n) ? str.substr(0, n-1) + '...' : str;
};

function getRandomFact(handlerInput) {
  // const ayatOrFact = Math.floor(Math.random() * 2);
  const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

  let fact = {response : '', reprompt: '', title: '', text: '', shouldEndSession: false };
  var random_boolean = Math.random() >= 0.5;
  if(random_boolean){
    fact.response = requestAttributes.t('FACTS');
    fact.reprompt = requestAttributes.t('REPROMPT_TEXT');
    fact.title = requestAttributes.t('FACT_TITLE');
    fact.text = fact.response;
    fact.image = requestAttributes.t('IMAGES');
  } else {
    let verse = requestAttributes.t('VERSES');
    fact.response = '<audio src="' + verse.audio + '" />' + verse.say;
    fact.reprompt = requestAttributes.t('REPROMPT_TEXT');
    fact.title = verse.num;
    fact.text = verse.text;
    fact.image = requestAttributes.t('IMAGES');
  }

  let history = sessionAttributes.history || [];
  if(sessionAttributes.curIndex===undefined)
    sessionAttributes.curIndex = -1;
  //let curIndex = sessionAttributes.curIndex || -1;

  history.push(fact);
  sessionAttributes.curIndex++;

  sessionAttributes.history = history;
  //sessionAttributes.curIndex = curIndex;

  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  console.log('In Next: History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);

  return fact;

  // let factArr;
  // let factIndex, imgIndex;
  // let randomFact;
  //
  // if(ayatOrFact==1){
  //   factArr = requestAttributes.t('FACTS');  // factsData.data;
  // } else {
  //   factArr = requestAttributes.t('VERSES'); // factsData.verses;
  // }
  //
  // factIndex = Math.floor(Math.random() * factArr.length);
  // randomFact = factArr[factIndex];
  //
  // let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  // let history = sessionAttributes['history'] || [];
  // let curIndex = sessionAttributes['curIndex'] || 0;
  //
  // let fact = {};
  // fact.ayatOrFact = ayatOrFact;
  // fact.randomFact = randomFact;
  // fact.imgIndex = imgIndex;
  //
  // if(history.length > 100) {
  //   history.shift();
  // }
  // history.push(fact);
  //
  // sessionAttributes.history = history;
  // sessionAttributes.curIndex = curIndex;
  // sessionAttributes.curFact = history[curIndex];
  //
  // handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  // console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
}

// function getFactResponse(fact) {
//   let response = {};
//   let say;
//   let text, cardText;
//   let title;

//   if(fact.ayatOrFact==1){
//     say = GET_FACT_MESSAGE + fact.randomFact;
//     text = fact.randomFact;
//     cardText = fact.randomFact;
//     title = 'Quran Facts';
//   } else {
//     say = GET_AYAT_MESSAGE + '<audio src="' + fact.randomFact.audio + '" />' + fact.randomFact.say;
//     text = fact.randomFact.text + '<br />' + ' - '+ fact.randomFact.num;
//     cardText = fact.randomFact.text + '\n' + ' - '+ fact.randomFact.num;
//     title = 'Quran Aayat';
//   }
//   response.say = say;
//   response.text = text;
//   response.cardText = cardText;
//   response.title = title;

//   return response;
// }

// const SKILL_NAME = 'Quran Facts';
// const GET_FACT_MESSAGE = 'Here\'s your fact: ';
// const GET_AYAT_MESSAGE = 'Here\'s a verse from Quran: ';
// const HELP_MESSAGE = 'You can say tell me a quran fact, or, you can say exit... What can I help you with?';
// const HELP_REPROMPT = 'What can I help you with?';
// const STOP_MESSAGE = 'Goodbye!';
//
// const REPROMPT_TEXT = [
//   'Say next to listen to next fact.',
//   'Say repeat to repeat the fact.',
//   'Say previous to listen to previous fact.',
//   'You can say next, previous or repeat.',
//   'Do you want to listen to another fact?',
//   'Want another fact?',
//   'Want some more?',
// ];

function randomArrayElement(array) {
  var i = 0;
  i = Math.floor(Math.random() * array.length);
  return(array[i]);
}

function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.)
{                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay
  const hasDisplay =
  handlerInput.requestEnvelope.context &&
  handlerInput.requestEnvelope.context.System &&
  handlerInput.requestEnvelope.context.System.device &&
  handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
  handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;

  return hasDisplay;
}

const welcomeCardImg = {
  smallImageUrl: "https://s3.amazonaws.com/quran-facts/card_logo_small.jpg",
  largeImageUrl: "https://s3.amazonaws.com/quran-facts/card_logo_large.jpg"
};

//const skillBuilder = Alexa.SkillBuilders.standard();
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
.addRequestHandlers(
  GetNewFactHandler,
  NextHandler,
  PreviousHandler,
  RepeatHandler,
  // YesHandler,
  HelpHandler,
  ExitHandler,
  SessionEndedRequestHandler
)
.addRequestInterceptors(LocalizationInterceptor)
.addErrorHandlers(ErrorHandler)
.lambda();
