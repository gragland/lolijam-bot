require("dotenv").config();
const express = require("express");
const { Client } = require("discord.js");
const allWords = require("an-array-of-english-words");
const urbanDictionary = require("urban-dictionary");
const { addToDb } = require("./supabaseClient");

const app = express();
const client = new Client();
client.login(process.env.DISCORD_BOT_TOKEN);

// If a word is not in `allWords` and also not in Urban Dictionary
// with at least the upvote score defined below then it will be considered
// an invented word.
const URBAN_DICTIONARY_MIN_SCORE = 50;

client.once("ready", () => {
  console.log(`${client.user.username} logged in`);
});

client.on("message", async (message) => {
  if (
    // Only handle messages from bot
    !message.author.bot &&
    // and from the #lolijam channel
    message.channel.id == process.env.DISCORD_CHANNEL_ID
  ) {
    const { content } = message;
    // Split into an array of words
    const wordArray = content.split(" ");
    // Keep track of invented words
    const inventedWords = [];

    console.log("message:", content);

    // Iterate through each word in the message
    for (let i = 0; i < wordArray.length; i++) {
      let word = wordArray[i];
      // Remove all but a-z characters abd make lowercase
      word = word.replace(/[^a-z]/gi, "").toLowerCase();

      console.log("looking up:", word);

      // If we've manually specified it's a real word
      if (knownRealWords.find((w) => w === word)) {
        console.log("found in known real words, skipping lookup");
        // Skip any further processing
        continue;
      }

      // If we've manually specified it's an invented word
      if (specialInventedWords.find((w) => w === word)) {
        console.log("found special invented word, skipping lookup");
        // Throw in an extra emoji
        // TODO: Even more emojis or a text response?
        message.react(getPositiveEmoji());
        // Add to invented words
        inventedWords.push(word);
        // Skip any further processing
        continue;
      }

      // Find in our `allWords` array (contains 275k english words)
      const resultAllWords = allWords.find((w) => w === word);
      console.log("resultAllWords:", resultAllWords);

      // If not in `allWords` lookup in urban dictionary
      let resultUrbanDictionary;
      if (!resultAllWords) {
        try {
          let result = await urbanDictionary.define(word);
          result = result && result[0]; // Get first result
          console.log("urban dictionary result", result);

          if (result) {
            // Require a minimum popularity score to consider it a real word
            // The goal is to just handle slang that the dictionary wouldn't contain
            const score = result.thumbs_up - result.thumbs_down;
            if (score > URBAN_DICTIONARY_MIN_SCORE) {
              resultUrbanDictionary = result;
            } else {
              console.log(
                "urban dictionary score is low, consider it an invented word"
              );
            }
          }
        } catch (error) {
          console.log("urban dictionary error", error.message);
        }
      }

      // If not found in `allWords` or Urban Dictionary then add to `inventedWords`
      if (!resultAllWords && !resultUrbanDictionary) {
        inventedWords.push(word);
      }
    }
    // If no invented words reply with a positive emoji
    if (inventedWords.length === 0) {
      message.react(getNegativeEmoji());
      //message.reply(getResponse());
    } else {
      // Otherwise reply with a negative emoji
      message.react(getPositiveEmoji());
      // Add each word to the database along with the author
      inventedWords.forEach((word) =>
        addToDb(
          `${message.author.username}#${message.author.discriminator}`,
          word
        )
      );
    }
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`🚀 the server is blasting off!`);
});

// Helper functions

const getPositiveEmoji = () => {
  const emojis = [
    "🤩",
    "👍",
    "👌",
    "💃",
    "❤️",
    "🥳",
    "👀",
    "💯",
    "🤑",
    "🎉",
    "😍",
    "😆",
    "🌟",
    "🕺",
  ];
  const index = Math.floor(Math.random() * emojis.length);
  return emojis[index];
};

const getNegativeEmoji = () => {
  const emojis = ["😑", "👎", "🙅‍♂️", "😖", "🤬", "🤮"];
  const index = Math.floor(Math.random() * emojis.length);
  return emojis[index];
};

// Add common words here to avoid an urban dictionary lookup
// Or any that are for some reason not in an-array-of-english-words or urban dictionary
// but we want to consider to be real
const knownRealWords = ["gm"];

// Add invented words here to avoid an urban dictionary lookup
// Only a few invented words people are likely to use alot, but as we get
// going there may be others with can add here.
// The bot also throws in another emoji, which we can expand on to indicate
// it's a word that the bot especially likes.
const specialInventedWords = ["lolijam", "lootlang"];

// Not using responses currently because they're too much noise
// Maybe we can have the bot respond if a user has multiple messages
// in a row that don't include invented words.
const getResponse = () => {
  const responses = [
    "you’re not lolijamming correctly",
    "that’s not a good lolijam",
    "come on, you can lolijam better than that!",
    "this is exhausting",
    "try harder",
    "that ain’t it kid",
    "nope",
    "that’s not really lolijam material",
    "god give me the strength to endure your complete lack of lolijam",
    "nice try, but nope",
    "not quite",
    "try again hot shot",
    "you make me so angry",
  ];

  const index = Math.floor(Math.random() * responses.length);
  return responses[index];
};
