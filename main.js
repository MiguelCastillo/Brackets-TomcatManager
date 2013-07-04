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


    // Look for the menu where we will be inserting our theme menu
    var menu = Menus.addMenu("Tomcat", "tomcatManager", Menus.BEFORE, Menus.AppMenuBar.HELP_MENU);


    var commands = {
        "configure": {
            id: "tomcat.Configure",
            name: "Configure",
            exec: function() {
                // Open dialog to configure tomcat
                console.log(commands.configure);
            }
        }
    };


    // Load styling
    ExtensionUtils.loadStyleSheet(module, "tmpl/tomcatManager.css");


    for ( var iCmd in commands ) {
        if ( commands.hasOwnProperty(iCmd) === false ) {
            continue;
        }

        var command = commands[iCmd];
        CommandManager.register(command.name, command.id, command.exec);
        menu.addMenuItem(command.id);
    }

    menu.addMenuDivider();



    function setCurrentServer(server) {
        var $console = $(tmpl.console).appendTo($tomcatManager.find(".consoleContainer").empty());
        var $actions = $(tmpl.actions).appendTo($tomcatManager.find(".actionsContainer").empty());
        var _instance = false;

        $actions.on("click", ".start", function(evt) {
            tomcat.start(server).done(instanceManager);
        })
        .on("click", ".stop", function(evt) {
            tomcat.stop(_instance);
        })
        .on("click", ".clear", function(evt) {
            $console.find(".messages").empty();
        });


        function instanceManager(instance) {
            _instance = instance;

            $(instance).on("tomcat.started", function(evt, success, message) {
                //console.log("tomcat.start", success, message);
            });

            $(instance).on("tomcat.stopped", function(evt, success, message) {
                //console.log("tomcat.stopped", success, message);
            });

            $(instance).on("tomcat.message", function(evt, message) {
                var messageHtml = Mustache.render(tmpl.consoleMessage, message);
                $console.find(".messages").append($(messageHtml));
            });
        }
    }


    function unregisterServer(server) {
        menu.removeMenuItem(server.name);
        //CommandManager.get(config.id);
    }


    function registerServer(server) {
        // Register tomcat items as menu items so that clicking on one
        // of them can trigger starting it up and opening up the console
        // for it.
        CommandManager.register(server.name, server.name, function() {
            if ( !this.getChecked() ) {
                this.setChecked(true);
                toggle(true);
                setCurrentServer(server);
            }
            else {
                this.setChecked(false);
            }
        });

        menu.addMenuItem(server.name);
    }


    configurations.ready(function() {
        function iterate( config, callback ) {
            var servers = config.Servers;
            for ( var iServer in servers ) {
                if ( servers.hasOwnProperty(iServer) === false ) {
                    continue;
                }

                var server = configurations.getServerDetails(iServer);
                callback(server, config);
            }
        }

        $(configurations).on("load", function(event, configs) {
            iterate(configs, registerServer);
        });

        $(configurations).on("unload", function(event, configs) {
            iterate(configs, unregisterServer);
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


    AppInit.htmlReady(function () {
        PanelManager.createBottomPanel("tomcat.results", $(tmpl.tomcatManager), 100);
        $tomcatManager = $("#tomcatManager");
        $tomcatManager.on("click", ".close", function (evt) {
            toggle();
        });
    });

});

