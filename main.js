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

    var $tomcatManager  = null;

    // Load up styling
    ExtensionUtils.loadStyleSheet(module, "views/tomcatManager.css");

    // Load up tomcatManager widget
    require("views/tomcatManager");

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
        $tomcatManager = $("<div id='tomcatManager' class='bottom-panel vert-resizable top-resizer'>").tomcatManager();
        $tomcatManager.on("click", ".close", function (evt) {
            toggle();
        });

        PanelManager.createBottomPanel("tomcat.results", $tomcatManager, 100);
        registerMenu();
    });

});

