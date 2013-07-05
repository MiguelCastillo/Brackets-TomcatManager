/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */


define(function (require, exports, module) {
    "use strict";

    var AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        Menus           = brackets.getModule("command/Menus"),
        PanelManager    = brackets.getModule("view/PanelManager"),
        Resizer         = brackets.getModule("utils/Resizer");

    var tomcat           = require("Tomcat"),
        configurations   = require("ConfigurationManager");

    var tmpl = {
        tomcatManager: require("text!tmpl/tomcatManager.html"),
        console: require("text!tmpl/console.html"),
        consoleMessage: require("text!tmpl/consoleMessage.html"),
        actions: require("text!tmpl/actions.html")
    };

    var $tomcatManager = false;


    // Load styling
    ExtensionUtils.loadStyleSheet(module, "tmpl/tomcatManager.css");


    configurations.ready(function() {
        var _server = null,
            $actionsContainer = $tomcatManager.find(".actionsContainer"),
            $consoleContainer = $tomcatManager.find(".consoleContainer").append($(tmpl.console)),
            $consoleMessages  = $consoleContainer.find(".messages");

        $actionsContainer.on("click", ".start", function(evt) {
            start(_server);
        })
        .on("click", ".stop", function(evt) {
            stop(_server);
        })
        .on("click", ".clear", function(evt) {
            $consoleMessages.empty();
        })
        .change("select.serverList", function(evt) {
            var val = $(this).find("select.serverList option:selected").attr("value");
            _server = configurations.getServerDetails(val);
        });


        function start( server ) {
            if ( server ) {
                $.when(stop( server )).then(function() {
                    return tomcat.start(server).done(instanceManager);
                });
            }
        }


        function stop( server ) {
            if ( server && server._instance ) {
                return tomcat.stop( server._instance );
            }
        }


        function instanceManager(instance) {
            _server._instance = instance;

            $(instance).on("tomcat.started", function(evt, success, message) {
                //console.log("tomcat.start", success, message);
            });

            $(instance).on("tomcat.stopped", function(evt, success, message) {
                //console.log("tomcat.stopped", success, message);
            });

            $(instance).on("tomcat.message", function(evt, message) {
                var messageHtml = Mustache.render(tmpl.consoleMessage, message);
                $consoleMessages.append($(messageHtml));
            });
        }


        function init(server) {
            if ( !_server ) {
                _server = server;
            }
        }


        function iterate( config, callback ) {
            var servers = config.Servers;
            for ( var iServer in servers ) {
                if ( servers.hasOwnProperty(iServer) === false ) {
                    continue;
                }

                callback(configurations.getServerDetails(iServer));
            }
        }


        $(configurations).on("load", function(event, config) {
            _server = null;
            iterate(config, init);

            var actionsHtml = Mustache.render(tmpl.actions, configurations);
            $(actionsHtml).appendTo($actionsContainer.empty());
        });


        $(configurations).on("unload", function(event, config) {
            //iterate(config, uninit);
        });
    });


    function toggle(open) {
        if ( open === undefined ) {
            open = !$tomcatManager.addClass("open");
        }

        if ( open === true ) {
            $tomcatManager.addClass("open");
            Resizer.show($tomcatManager);
        }
        else {
            $tomcatManager.removeClass("open");
            Resizer.hide($tomcatManager);
        }
    }


    function registerMenu() {
        // Look for the menu where we will be inserting our theme menu
        var menu = Menus.addMenu("Tomcat", "tomcatManager", Menus.BEFORE, Menus.AppMenuBar.HELP_MENU);

        var commands = {
            "configure": {
                id: "tomcat.Configure",
                name: "Manager",
                exec: function() {
                    toggle(true);
                }
            }
        };

        for ( var iCmd in commands ) {
            if ( commands.hasOwnProperty(iCmd) === false ) {
                continue;
            }

            var command = commands[iCmd];
            CommandManager.register(command.name, command.id, command.exec);
            menu.addMenuItem(command.id);
        }
    }


    AppInit.htmlReady(function () {
        $tomcatManager = $(tmpl.tomcatManager);
        $tomcatManager.on("click", ".close", function (evt) {
            toggle();
        });

        PanelManager.createBottomPanel("tomcat.results", $tomcatManager, 100);
        registerMenu();
    });

});

