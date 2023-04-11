const axios = require('axios');

const loginUrl = 'https://poe.com/login';
const botUrl = 'https://poe.com/Imtbot';

const email = 'imtiyazakiwat0@gmail.com';
const password = 'irmztwaynk@10000';
const question = 'What is the capital of France?';

async function loginAndAskBot() {
  try {
    // Log in to the website
    const loginResponse = await axios.post(loginUrl, {
      email: email,
      password: password
    }, {
      withCredentials: true
    });
    
    if (loginResponse.status === 200) {
      console.log('Logged in successfully');

      // Send the question to the bot
      const botResponse = await axios.post(botUrl, {
        text: question
      }, {
        withCredentials: true,
        responseType: 'text' // set the response type to text to log the HTML response
      });
      
      console.log(botResponse.data); // log the entire HTML response from the server
    } else {
      console.error('Login unsuccessful');
    }
  } catch (error) {
    console.error(error);
  }
}

loginAndAskBot();