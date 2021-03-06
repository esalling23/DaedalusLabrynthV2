

const _ = require("underscore");
const request = require("request");

module.exports = function(controller) {

  controller.confirmMovement = function(params) {

    var thread = params.thread ? params.thread : controller.determineThread(params.script, params.user);
    var vars = {};

    if (!thread)
      thread = 'default';

    // console.log(params.user.codesEntered, params.data.value);

    // If this user has already entered this code
    if (params.user.codesEntered) {
      if (params.user.codesEntered.includes(params.data.value)) {
        // If there's a repeat thread, use that
        if (_.contains(params.script.threads, "repeat"))
          thread = "repeat";

        // If this is a channel, send them to the channel thread
        if (params.data.value.includes('channel')) {
          thread = "correct_" + parseInt(params.data.value.split('_')[1]);
          params.data.value = 'remote';
          vars.link = true;
        }

      }
    }

    if (["many_dots", "pick_up_plaque", "few_dots",  "safari"].includes(params.data.value)) {
      vars.link = true

      controller.makeCard(params.bot, params.event, params.data.value, thread, vars, function(card) {
          // replace the original button message with a new one
          params.bot.replyInteractive(params.event, card);

      });
    }
  }

  controller.determineThread = function(script, user) {

    var thread;

    _.each(script.threads, function(t, v) {

      if (!thread || v.includes("combo")) {
        if (v.split("_").length > 1) {

          if (v.includes("combo")) {
            if (user.events) {

              _.each(user.events, function(event) {
                if (v.includes(event) && v.split("_")[2].includes(user.currentState))
                  thread = v;
              });

            }

          } else if (v.includes("state")) {
            if (user.currentState != 'default') {
              if (v.split("_")[1].includes(user.currentState))
                thread = v;
            }

          } else if (v.includes("event")) {

            if (user.events) {

              _.each(user.events, function(event) {
                if (v.includes(event))
                  thread = v;
              });

            }

          }

        }
      }

    });

    return thread;
  }
}
