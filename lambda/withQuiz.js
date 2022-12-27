/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
//const Alexa = require('ask-sdk');

const factsData = require('./factsData.js');
const questions = require('./questions');

const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');

const ANSWER_COUNT = 4;
const GAME_LENGTH = 5;

const GetNewFactHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return request.type === 'LaunchRequest'
    || (request.type === 'IntentRequest'
    && (request.intent.name === 'GetNewFactIntent' | sessionAttributes.handleFlow));
  },
  handle(handlerInput) {
    if(handlerInput.requestEnvelope.request.type === 'LaunchRequest')
      getRandomFact(handlerInput);

    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let response = getFactResponse(sessionAttributes.curFact);

    if (supportsDisplay(handlerInput) ) {
      let imgIndex = Math.floor(Math.random() * factsData.images.length);
      const image = new Alexa.ImageHelper()
      .addImageInstance(factsData.images[imgIndex])
      .getImage();

      const primaryText = new Alexa.RichTextContentHelper()
      .withPrimaryText(response.text)
      .getTextContent();

      handlerInput.responseBuilder.addRenderTemplateDirective({
        type: 'BodyTemplate1',
        token: 'string',
        backButton: 'HIDDEN',
        backgroundImage: image,
        title: response.title,
        textContent: primaryText,
      });
    }

    sessionAttributes.handleFlow = false;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
    .speak(response.say + ' ' + randomArrayElement(REPROMPT_TEXT))
    .reprompt(randomArrayElement(REPROMPT_TEXT))
    .withStandardCard(response.title, response.cardText, welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
    //.withShouldEndSession(true)
    .getResponse();
  },
};

const QuizHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'QuizIntent';
  }, 
  handle(handlerInput) {
    return startGame(true, handlerInput);
  }
};

const AnswerIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && (handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'DontKnowIntent');
  },
  handle(handlerInput) {
    if (handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent') {
      return handleUserGuess(false, handlerInput);
    }
    return handleUserGuess(true, handlerInput);
  },
};

const NextHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && (request.intent.name === 'AMAZON.NextIntent'
        || request.intent.name === 'AMAZON.MoreIntent');
  },
  handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.curIndex++;
    console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
    if(sessionAttributes.curIndex < 0 | sessionAttributes.curIndex >= sessionAttributes.history.length){
      getRandomFact(handlerInput); // give random fact because index is out of bounds
    } else {
      sessionAttributes.curFact = sessionAttributes.history[sessionAttributes.curIndex];
    }
    sessionAttributes.handleFlow = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    return GetNewFactHandler.handle(handlerInput);
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
    console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
    if(sessionAttributes.curIndex < 0 | sessionAttributes.curIndex >= sessionAttributes.history.length){
      sessionAttributes.curIndex++;
    }
    sessionAttributes.handleFlow = true;
    sessionAttributes.curFact = sessionAttributes.history[sessionAttributes.curIndex];
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    return GetNewFactHandler.handle(handlerInput);
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
    if(sessionAttributes.speechOutput) {
      return handlerInput.responseBuilder
        .speak(sessionAttributes.speechOutput)
        .reprompt(sessionAttributes.repromptText)
        .getResponse();
    } else {
      console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
      sessionAttributes.handleFlow = true;
      sessionAttributes.curFact = sessionAttributes.history[sessionAttributes.curIndex];
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      return GetNewFactHandler.handle(handlerInput);
    }
  },
};

const YesHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.curIndex++;
    getRandomFact(handlerInput);
    sessionAttributes.handleFlow = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    return GetNewFactHandler.handle(handlerInput);
  }
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
    && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
    .speak(HELP_MESSAGE)
    .reprompt(HELP_REPROMPT)
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
    return handlerInput.responseBuilder
    .speak(STOP_MESSAGE)
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
    .speak('Sorry, an error occurred.')
    .reprompt('Sorry, an error occurred.')
    .getResponse();
  },
};

function getRandomFact(handlerInput) {
  const ayatOrFact = Math.floor(Math.random() * 2);
  let factArr;
  let factIndex, imgIndex;
  let randomFact;

  if(ayatOrFact==1){
    factArr = factsData.data;
  } else {
    factArr = factsData.verses;
  }

  factIndex = Math.floor(Math.random() * factArr.length);
  randomFact = factArr[factIndex];

  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let history = sessionAttributes['history'] || [];
  let curIndex = sessionAttributes['curIndex'] || 0;

  let fact = {};
  fact.ayatOrFact = ayatOrFact;
  fact.randomFact = randomFact;
  fact.imgIndex = imgIndex;

  if(history.length > 100) {
    history.shift();
  }
  history.push(fact);

  sessionAttributes.history = history;
  sessionAttributes.curIndex = curIndex;
  sessionAttributes.curFact = history[curIndex];

  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  console.log('History Length: ' + sessionAttributes.history.length + ' Cur Index = ' + sessionAttributes.curIndex);
}

function getFactResponse(fact) {
  let response = {};
  let say;
  let text, cardText;
  let title;

  if(fact.ayatOrFact==1){
    say = GET_FACT_MESSAGE + fact.randomFact;
    text = fact.randomFact;
    cardText = fact.randomFact;
    title = 'Quran Facts';
  } else {
    say = GET_AYAT_MESSAGE + '<audio src="' + fact.randomFact.audio + '" />' + fact.randomFact.say;
    text = fact.randomFact.text + '<br />' + ' - '+ fact.randomFact.num;
    cardText = fact.randomFact.text + '\n' + ' - '+ fact.randomFact.num;
    title = 'Quran Aayat';
  }
  response.say = say;
  response.text = text;
  response.cardText = cardText;
  response.title = title;

  return response;
}

function populateGameQuestions(translatedQuestions) {
  const gameQuestions = [];
  const indexList = [];
  let index = translatedQuestions.length;
  if (GAME_LENGTH > index) {
    throw new Error('Invalid Game Length.');
  }

  for (let i = 0; i < translatedQuestions.length; i += 1) {
    indexList.push(i);
  }

  for (let j = 0; j < GAME_LENGTH; j += 1) {
    const rand = Math.floor(Math.random() * index);
    index -= 1;

    const temp = indexList[index];
    indexList[index] = indexList[rand];
    indexList[rand] = temp;
    gameQuestions.push(indexList[index]);
  }
  return gameQuestions;
}

function populateRoundAnswers(gameQuestionIndexes, correctAnswerIndex, correctAnswerTargetLocation, translatedQuestions) {
  const answers = [];
  const translatedQuestion = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]];
  const answersCopy = translatedQuestion[Object.keys(translatedQuestion)[0]].slice();
  let index = answersCopy.length;

  if (index < ANSWER_COUNT) {
    throw new Error('Not enough answers for question.');
  }

  // Shuffle the answers, excluding the first element which is the correct answer.
  for (let j = 1; j < answersCopy.length; j += 1) {
    const rand = Math.floor(Math.random() * (index - 1)) + 1;
    index -= 1;

    const swapTemp1 = answersCopy[index];
    answersCopy[index] = answersCopy[rand];
    answersCopy[rand] = swapTemp1;
  }

  // Swap the correct answer into the target location
  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    answers[i] = answersCopy[i];
  }
  const swapTemp2 = answers[0];
  answers[0] = answers[correctAnswerTargetLocation];
  answers[correctAnswerTargetLocation] = swapTemp2;
  return answers;
}

function isAnswerSlotValid(intent) {
  const answerSlotFilled = intent
    && intent.slots
    && intent.slots.Answer
    && intent.slots.Answer.value;
  const answerSlotIsInt = answerSlotFilled
    && !Number.isNaN(parseInt(intent.slots.Answer.value, 10));
  return answerSlotIsInt
    && parseInt(intent.slots.Answer.value, 10) < (ANSWER_COUNT + 1)
    && parseInt(intent.slots.Answer.value, 10) > 0;
}

function handleUserGuess(userGaveUp, handlerInput) {
  const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
  const { intent } = requestEnvelope.request;

  const answerSlotValid = isAnswerSlotValid(intent);

  let speechOutput = '';
  let speechOutputAnalysis = '';

  const sessionAttributes = attributesManager.getSessionAttributes();
  const gameQuestions = sessionAttributes.questions;
  let correctAnswerIndex = parseInt(sessionAttributes.correctAnswerIndex, 10);
  let currentScore = parseInt(sessionAttributes.score, 10);
  let currentQuestionIndex = parseInt(sessionAttributes.currentQuestionIndex, 10);
  const { correctAnswerText } = sessionAttributes;
  const requestAttributes = attributesManager.getRequestAttributes();
  const translatedQuestions = requestAttributes.t('QUESTIONS');


  if (answerSlotValid
    && parseInt(intent.slots.Answer.value, 10) === sessionAttributes.correctAnswerIndex) {
    currentScore += 1;
    speechOutputAnalysis = requestAttributes.t('ANSWER_CORRECT_MESSAGE');
  } else {
    if (!userGaveUp) {
      speechOutputAnalysis = requestAttributes.t('ANSWER_WRONG_MESSAGE');
    }

    speechOutputAnalysis += requestAttributes.t(
      'CORRECT_ANSWER_MESSAGE',
      correctAnswerIndex,
      correctAnswerText
    );
  }

  // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
  if (sessionAttributes.currentQuestionIndex === GAME_LENGTH - 1) {
    speechOutput = userGaveUp ? '' : requestAttributes.t('ANSWER_IS_MESSAGE');
    speechOutput += speechOutputAnalysis + requestAttributes.t(
      'GAME_OVER_MESSAGE',
      currentScore.toString(),
      GAME_LENGTH.toString()
    );

    return responseBuilder
      .speak(speechOutput)
      .getResponse();
  }
  currentQuestionIndex += 1;
  correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
  const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
  const roundAnswers = populateRoundAnswers(
    gameQuestions,
    currentQuestionIndex,
    correctAnswerIndex,
    translatedQuestions
  );
  const questionIndexForSpeech = currentQuestionIndex + 1;
  let repromptText = requestAttributes.t(
    'TELL_QUESTION_MESSAGE',
    questionIndexForSpeech.toString(),
    spokenQuestion
  );

  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    repromptText += `${i + 1}. ${roundAnswers[i]}. `;
  }

  speechOutput += userGaveUp ? '' : requestAttributes.t('ANSWER_IS_MESSAGE');
  speechOutput += speechOutputAnalysis
    + requestAttributes.t('SCORE_IS_MESSAGE', currentScore.toString())
    + repromptText;

  const translatedQuestion = translatedQuestions[gameQuestions[currentQuestionIndex]];

  Object.assign(sessionAttributes, {
    speechOutput: repromptText,
    repromptText,
    currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestions,
    score: currentScore,
    correctAnswerText: translatedQuestion[Object.keys(translatedQuestion)[0]][0]
  });

  return responseBuilder.speak(speechOutput)
    .reprompt(repromptText)
    .withSimpleCard(requestAttributes.t('GAME_NAME'), repromptText)
    .getResponse();
}

function startGame(newGame, handlerInput) {
  const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
  let speechOutput = newGame
    ? requestAttributes.t('NEW_GAME_MESSAGE', requestAttributes.t('GAME_NAME'))
      + requestAttributes.t('WELCOME_MESSAGE', GAME_LENGTH.toString())
    : '';
  const translatedQuestions = requestAttributes.t('QUESTIONS');
  const gameQuestions = populateGameQuestions(translatedQuestions);
  const correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));

  const roundAnswers = populateRoundAnswers(
    gameQuestions,
    0,
    correctAnswerIndex,
    translatedQuestions
  );
  const currentQuestionIndex = 0;
  const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
  let repromptText = requestAttributes.t('TELL_QUESTION_MESSAGE', '1', spokenQuestion);
  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    repromptText += `${i + 1}. ${roundAnswers[i]}. `;
  }

  speechOutput += repromptText;
  const sessionAttributes = {};

  const translatedQuestion = translatedQuestions[gameQuestions[currentQuestionIndex]];

  Object.assign(sessionAttributes, {
    speechOutput: repromptText,
    repromptText,
    currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestions,
    score: 0,
    correctAnswerText: translatedQuestion[Object.keys(translatedQuestion)[0]][0]
  });

  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  return handlerInput.responseBuilder
    .speak(speechOutput)
    .reprompt(repromptText)
    .withSimpleCard(requestAttributes.t('GAME_NAME'), repromptText)
    .getResponse();
}

function helpTheUser(newGame, handlerInput) {
  const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
  const askMessage = newGame
    ? requestAttributes.t('ASK_MESSAGE_START')
    : requestAttributes.t('REPEAT_QUESTION_MESSAGE') + requestAttributes.t('STOP_MESSAGE');
  const speechOutput = requestAttributes.t('HELP_MESSAGE', GAME_LENGTH) + askMessage;
  const repromptText = requestAttributes.t('HELP_REPROMPT') + askMessage;

  return handlerInput.responseBuilder.speak(speechOutput).reprompt(repromptText).getResponse();
}

const LocalizationInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
      resources: languageString,
      returnObjects: true
    });

    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.t(...args);
    };
  },
};

const SKILL_NAME = 'Quran Facts';
const GET_FACT_MESSAGE = 'Here\'s your fact: ';
const GET_AYAT_MESSAGE = 'Here\'s a verse from Quran: ';
const HELP_MESSAGE = 'You can say tell me a quran fact, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

const REPROMPT_TEXT = [
  'Say next to listen to next fact.',
  'Say repeat to repeat the fact.',
  'Say previous to listen to previous fact.',
  'You can say next, previous or repeat.',
  'Do you want to listen to another fact?',
  'Want another fact?',
  'Want some more?',
];

const languageString = {
  en: {
    translation: {
      QUESTIONS: questions.QUESTIONS_EN_US,
      GAME_NAME: 'Quran Quiz',
      HELP_MESSAGE: 'I will ask you %s multiple choice questions. Respond with the number of the answer. For example, say one, two, three, or four. To start a new game at any time, say, start game. ',
      REPEAT_QUESTION_MESSAGE: 'To repeat the last question, say, repeat. ',
      ASK_MESSAGE_START: 'Would you like to start playing?',
      HELP_REPROMPT: 'To give an answer to a question, respond with the number of the answer. ',
      STOP_MESSAGE: 'Would you like to keep playing?',
      CANCEL_MESSAGE: 'Ok, let\'s play again soon.',
      NO_MESSAGE: 'Ok, we\'ll play another time. Goodbye!',
      TRIVIA_UNHANDLED: 'Try saying a number between 1 and %s',
      HELP_UNHANDLED: 'Say yes to continue, or no to end the game.',
      START_UNHANDLED: 'Say start to start a new game.',
      NEW_GAME_MESSAGE: 'Welcome to %s. ',
      WELCOME_MESSAGE: 'I will ask you %s questions, try to get as many right as you can. Just say the number of the answer. Let\'s begin. ',
      ANSWER_CORRECT_MESSAGE: 'correct. ',
      ANSWER_WRONG_MESSAGE: 'wrong. ',
      CORRECT_ANSWER_MESSAGE: 'The correct answer is %s: %s. ',
      ANSWER_IS_MESSAGE: 'That answer is ',
      TELL_QUESTION_MESSAGE: 'Question %s. %s ',
      GAME_OVER_MESSAGE: 'You got %s out of %s questions correct. Thank you for playing!',
      SCORE_IS_MESSAGE: 'Your score is %s. '
    },
  },
  'en-US': {
    translation: {
      QUESTIONS: questions.QUESTIONS_EN_US,
      GAME_NAME: 'Quran Quiz'
    },
  },
  'en-GB': {
    translation: {
      QUESTIONS: questions.QUESTIONS_EN_GB,
      GAME_NAME: 'Quran Quiz'
    },
  },
  'en-IN': {
    translation: {
      QUESTIONS: questions.QUESTIONS_EN_IN,
      GAME_NAME: 'Quran Quiz'
    },
  },
};


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
  YesHandler,
  HelpHandler,
  ExitHandler,
  SessionEndedRequestHandler
)
.addErrorHandlers(ErrorHandler)
.lambda();
