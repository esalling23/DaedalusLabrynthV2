

/*

WHAT IS THIS?

This module demonstrates simple uses of Botkit's `hears` handler functions.

In these examples, Botkit is configured to listen for certain phrases, and then
respond immediately with a single line response.

*/

var wordfilter = require('wordfilter');
var _ = require("underscore");
var dataChannel;
var fs = require('fs');


const { WebClient } = require('@slack/client');

// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
const token = process.env.slackToken;

var web = new WebClient(token);

module.exports = function(controller) {
  
  
    // controller.hears("(^*)",   
  
    /* Collect some very simple runtime stats for use in the uptime/debug command */
    var stats = {
        triggers: 0,
        convos: 0,
    }

    controller.on('heard_trigger', function() {
        stats.triggers++;
    });

    controller.on('conversationStarted', function() {
        stats.convos++;
    });
  

    controller.hears(['^uptime','^debug'], 'direct_message,direct_mention', function(bot, message) {

        bot.createConversation(message, function(err, convo) {
            if (!err) {
                convo.setVar('uptime', formatUptime(process.uptime()));
                convo.setVar('convos', stats.convos);
                convo.setVar('triggers', stats.triggers);

                convo.say('My main process has been online for {{vars.uptime}}. Since booting, I have heard {{vars.triggers}} triggers, and conducted {{vars.convos}} conversations.');
                convo.activate();
            }
        });

    });
    
  controller.hears('^history (.*)', 'direct_message', function(bot, message) {
    console.log("getting the history of...", message.match);
    
    var identifier = message.match[1].toString();
    console.log(identifier);
    var token = bot.config.bot.app_token.toString();
    bot.api.channels.history({ token: token, channel: identifier }, function(err, data) {
      if (err) console.log(err)
      
      console.log(data);
      
      fs.writeFile('./data/db/tamagotchiStorage.json', JSON.stringify(data), 'utf8', (err) => {
          if (err) throw err;

          console.log("The file was succesfully saved!");
      });
    });
  });
  
  controller.hears('^storage (.*) (.*)','direct_message',function(bot,message) {
    var theBot = bot;
    
    
    if (message.channel == dataChannel) {
      console.log("we are in the special listening channel " + dataChannel);
    } else {
      console.log("we are not in the special channel " + dataChannel);
    }

    console.log("message: " + JSON.stringify(message.match));
    var storageType = message.match[1];
    var identifier = message.match[2];

    if (identifier) {
      
      controller.storage[storageType].get(identifier, function(err,storage) {

        console.log("storage: " + JSON.stringify(storage));

        theBot.reply(message, JSON.stringify(storage));

  //    // Export the chosen data into a json file
        fs.writeFile('./data/db/labyrinthStorage.json', JSON.stringify(storage), 'utf8', (err) => {
            if (err) throw err;

            console.log("The file was succesfully saved!");
        });


        if (err) {
          throw new Error(err);
        }

      });
      
    } else {
      
      controller.storage[storageType].all(function(err,storage) {

        console.log("storage: " + JSON.stringify(storage));

        theBot.reply(message, JSON.stringify(storage));

  //    // Export the chosen data into a json file
        fs.writeFile('./data/db/storage.json', JSON.stringify(storage), 'utf8', (err) => {
            if (err) throw err;

            console.log("The file was succesfully saved!");
        });


        if (err) {
          throw new Error(err);
        }

      });
    }
  });
  
  controller.hears('(.*)', 'ambient', function(bot,message) {
    
    
    // If we hear anything in the no-chat channels, delete it
    controller.storage.teams.get(message.team, function(err, team) {

      if (team.noChatChannels.includes(message.channel))
        deleteThisMsg(message, botReply, [message, 'sorry we had to delete that']);

    });
      

  });
  
  controller.hears('map','direct_message,direct_mention,ambient',function(bot,message) {

    var options = {
      bot: bot, 
      message: message
    };
    // Trigger the map event
    controller.trigger('map_event', [options]);
    
  }); // End hears "map"
  
  // Test for entry
  controller.hears("labyrinth", 'direct_message,direct_mention', function(bot, message) {
      controller.studio.get(bot, 'safe', message.user, message.channel).then(convo => {
        console.log(convo);
      });
  });
  
  controller.hears("escape_2", 'direct_message,direct_mention', function(bot, message) {
      controller.studio.run(bot, 'main_room', message.user, message.channel);
  });
  
  controller.hears("bot", 'direct_message', function(bot, message) {
    console.log(message);
    controller.storage.teams.get(message.team, function(err, team) {
      
      console.log(team.bot) 
      
    });
  });
  
  
  // Listen for 
  controller.hears("^generate (.*)", 'direct_message,direct_mention', function(bot, message) {
    
    console.log(message, "in the hears");
    var options = {
      bot: bot, 
      message: message, 
      forced: true
    };
    
    // if the message is "generate player" then generate player data
    if (message.match[0] == "generate player") {
      options.player = true;
      controller.trigger('generation_event', [options]);
    } else if (message.match[0] == "generate dev") {
      options.player = false;
      // Otherwise, generate development data for each puzzle
      controller.trigger('generation_event', [options]);
    } else {
      bot.reply(message, {
        'text': "Hmm.. please specify if you want to generate dev or player data!"
      });
    }
      
  });
  
  controller.hears("puzzle (.*)", 'direct_message,direct_mention', function(bot, message) {
    var options = {
      bot: bot, 
      message: message
    };
    console.log(message);
    // if the message is "generate player" then generate player data
    if (message.match[0] == "puzzle timer") {
      
      options.puzzleType = 'timer';
      controller.trigger('generate_puzzle', [options]);
      
    } else {
      
      bot.reply(message, {
        'text': "Hmm.. please specify if you want to generate dev or player data!"
      });
      
    }
    
  });

    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
    /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
    /* Utility function to format uptime */
    function formatUptime(uptime) {
        var unit = 'second';
        if (uptime > 60) {
            uptime = uptime / 60;
            unit = 'minute';
        }
        if (uptime > 60) {
            uptime = uptime / 60;
            unit = 'hour';
        }
        if (uptime != 1) {
            unit = unit + 's';
        }

        uptime = parseInt(uptime) + ' ' + unit;
        return uptime;
    }
  
  controller.hears("image_onboard", 'direct_message,direct_mention', function(bot, message) {
    console.log(message.user);
    controller.trigger("image_counter_onboard", [bot, message]);
    
  });
  
  controller.hears("prisoners_onboard", 'direct_message,direct_mention', function(bot, message) {
    console.log(message.user);
    controller.trigger("prisoners_onboard", [bot, message]);
    
  });
  
  controller.hears("delete", 'direct_message,direct_mention', function(bot, message) {
    console.log(message.user);
    deleteThisMsg(message, botReply, [message, 'sorry we had to delete that']);
    
  });

  
  var deleteThisMsg = function(message, callback, params) {
    controller.storage.teams.get(message.team, function(err, team) {
      var token = team.bot.app_token;

      var web = new WebClient(token);
      
      web.chat.delete(message.ts, message.channel).then(res => {
        console.log(res);
        callback(params);
      }).catch(err => console.log(err));
      
    });
  }
  
  var botReply = function(params) {
    
    console.log(params[0], params[1]);
    
  };
 
};
