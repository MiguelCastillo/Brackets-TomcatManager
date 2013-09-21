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

    var os            = require("os"),
        child_process = require("child_process");

    var _domainManager;


    function parseMessage(message) {
        // 1. Look for SEVERE: | INFO:
        // 2. lastIndexOf('\n') to get the date
        // 3. Repeat 1.
        message = ("" + message);
        var messages = [];
        
        while( message ) {
            var _source   = {};
            _source.start = 0;
            _source.end   = message.indexOf('\n'); // Skip \n
            _source.text  = message.substr(_source.start, _source.end);
            message       = message.substr(_source.end + 1);

            var _type   = {};
            _type.start = 0;
            _type.end   = message.indexOf(": ");
            _type.name  = message.substr(_type.start, _type.end);
            message     = message.substr(_type.end + 2);

            //
            // Figure out if there will be more info after reading the current message.
            //
            var _mark1 = message.indexOf("\nSEVERE: "),
                _mark2 = message.indexOf("\nINFO: ");
            
            if ( _mark1 !== -1 || _mark2 !== -1 ) {
                _mark1 = _mark1 !== -1 && _mark1 < _mark2 ? _mark1 : _mark2;
                _mark2 = message.lastIndexOf('\n', _mark1 - 1) + 1;
            }
            else {
                _mark2 = message.length;
            }


            messages.push({
                source: _source.text,
                type: _type.name,
                text: message.substr(0, _mark2 - 1) /* - Don't include the last \n */
            });
            

            message = message.substr(_mark2);
        }

        return messages;
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
        if ( os.platform() === "win32" ) {
            child = child_process.spawn("cmd", ["/c", "bin\\catalina.bat", "run"], {cwd: settings.AppServer.path, env: process.env});
        }
        else {
            child = child_process.spawn("sh", ["./bin/catalina.sh", "run"], {cwd: settings.AppServer.path, env: process.env});
        }

        child.stderr.on("data", function(data) {
            var messages = parseMessage(data), message;
            
            for ( var i in messages ) {
                message = messages[i];
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
            }
        });

        child.stdout.on("data", function(data) {
            // Not sure why stdout isn't getting any of the startup messages
            // that aren't errors...
            var messages = parseMessage(data);

            for ( var i in messages ) {
                _domainManager.emitEvent("tomcat", "message", [child.pid, messages[i]]);
            }
        });

        //child.on("exit", function(code, signal) {
        child.on("close", function(code, signal) {
            _domainManager.emitEvent("tomcat", "stopped", [child.pid, code, signal]);
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

        if ( os.platform() === "win32" ) {
            child = child_process.spawn("cmd", ["/c", "bin\\catalina.bat", "stop"], {cwd: instance.AppServer.path, env: process.env});
        }
        else {
            child = child_process.spawn("sh", ["./bin/catalina.sh", "stop"], {cwd: instance.AppServer.path, env: process.env});
        }

        child.stderr.on("data", function(data) {
            var messages = parseMessage(data);
            
            for ( var i in messages ) {
                _domainManager.emitEvent("tomcat", "message", [instance.pid, true, messages[i]]);
            }
        });

        child.stdout.on("data", function(data) {
            var messages = parseMessage(data);
            
            for ( var i in messages ) {
                _domainManager.emitEvent("tomcat", "message", [instance.pid, true, messages[i]]);
            }
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

