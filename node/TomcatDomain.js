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


(function() {
    "use strict";

    var os = require("os"),
        child_process = require("child_process");

    var _domainManager;


    function parseMessage(message) {
        var lines = ("" + message).split("\n");
        var length = lines.length;

        if (!length) {
            return "";
        }

        var source = lines.shift();
        var text   = lines.shift();

        var typeOffset = text.indexOf(":");
        var type       = text.substr(0, typeOffset);

        // Put message together.  The +2 is to skip the : and the extra space in the text.
        text = text.substr(typeOffset + 2);
        if ( lines.length ) {
            text = text + "\n" + lines.join("\n");
        }

        return {
            source: source,
            type: type,
            text: text
        };
    }


    /**
     * @private
     * Handler function for the simple.getMemory command.
     * @return {{total: number, free: number}} The total and free amount of
     *   memory on the user's system, in bytes.
     */
    function cmdGetMemory() {
        return {total: os.totalmem(), free: os.freemem()};
    }


    /**
    * @private
    * Starts a new tomcat instance with the provided settings
    */
    function cmdStart( settings ) {
        var child, starting = true;

        // Pass in run so that we can capture stdout and stderr messages
        child = child_process.spawn("sh", ["./bin/catalina.sh", "run"], {cwd: settings.AppServer.path, env: process.env});

        child.stderr.on("data", function(data) {
            var message = parseMessage(data);
            _domainManager.emitEvent("tomcat", "message", [child.pid, message]);

            if ( starting ) {
                if ( message.type === "INFO" && message.text.indexOf("Server startup in") === 0 ) {
                    // trigger startup succesfull
                    starting = false;
                    _domainManager.emitEvent("tomcat", "started", [child.pid, true, message]);
                }
                else if ( message.type === "SEVERE" ) {
                    // trigger a failure
                    starting = false;
                    _domainManager.emitEvent("tomcat", "started", [child.pid, false, message]);
                }
            }
        });

        child.stdout.on("data", function(data) {
            // Not sure why stdout isn't getting any of the startup messages
            // that aren't errors...
            var message = parseMessage(data);
            _domainManager.emitEvent("tomcat", "message", [child.pid, message]);
        });

        child.on("exit", function(code) {
            _domainManager.emitEvent("tomcat", "stopped", [child.pid, code]);
        });

        return {
            pid: child.pid
        };
    }


    /**
    * @private
    * Stops the currently running tomcat instance
    */
    function cmdStop( instance ) {
        var child;

        child = child_process.spawn("sh", ["./bin/catalina.sh", "stop"], {cwd: instance.AppServer.path, env: process.env});

        child.stderr.on("data", function(data) {
            var message = parseMessage(data);
            _domainManager.emitEvent("tomcat", "message", [instance.pid, true, message]);
        });

        child.stdout.on("data", function(data) {
            var message = parseMessage(data);
            _domainManager.emitEvent("tomcat", "message", [instance.pid, true, message]);
        });

        child.on("exit", function(code) {
            _domainManager.emitEvent("tomcat", "stopped", [instance.pid, code]);
        });

        return true;
    }


    /**
    * @private
    * Checks the status of a running instance of tomcat
    * @return Details about the running instance
    */
    function cmdGetStatus( ) {
        return {};
    }


    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        _domainManager = DomainManager;

        if (!_domainManager.hasDomain("tomcat")) {
            _domainManager.registerDomain("tomcat", {major: 0, minor: 1});
        }

        _domainManager.registerCommand(
            "tomcat",       // domain name
            "getMemory",    // command name
            cmdGetMemory,   // command handler function
            false           // this command is synchronous
        );

        _domainManager.registerCommand(
            "tomcat",       // domain name
            "start",        // command name
            cmdStart,       // command handler function
            false           // this command is synchronous
        );

        _domainManager.registerCommand(
            "tomcat",       // domain name
            "stop",         // command name
            cmdStop,        // command handler function
            false           // this command is synchronous
        );

        _domainManager.registerCommand(
            "tomcat",       // domain name
            "getStatus",    // command name
            cmdGetStatus,   // command handler function
            false           // this command is synchronous
        );


        _domainManager.registerEvent(
            "tomcat",
            "started"
        );

        _domainManager.registerEvent(
            "tomcat",
            "stopped"
        );

        _domainManager.registerEvent(
            "tomcat",
            "message"
        );
    }

    exports.init = init;

}());

