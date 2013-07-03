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
    * @return Tomcat instance used for shutting it down
    */
    function cmdStart( settings ) {
        var child;

        child = child_process.spawn("sh", ["./bin/catalina.sh", "start"], {cwd: settings.tomcat_path});

        child.stderr.on("data", function(data) {
            console.log("stderr: " + data);
        });

        child.stdout.on("data", function(data) {
            console.log("stdout: " + data);
        });

        child.on("error", function(data) {
            console.log("error", data);
        });

        child.on("close", function(code){
            console.log("exit code: " + code);
        });
    }


    /**
    * @private
    * Stops a running tomcat instance
    * @return Object for shutting down the tomcat instance.
    */
    function cmdStop( settings ) {
        var child;

        child = child_process.spawn("sh", ["./bin/catalina.sh", "stop"], {cwd: settings.tomcat_path});

        child.stderr.on("data", function(data) {
            console.log("stderr: " + data);
        });

        child.stdout.on("data", function(data) {
            console.log("stdout: " + data);
        });

        child.on("error", function(data) {
            console.log("error", data);
        });

        child.on("close", function(code){
            console.log("exit code: " + code);
        });
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
        if (!DomainManager.hasDomain("tomcat")) {
            DomainManager.registerDomain("tomcat", {major: 0, minor: 1});
        }

        DomainManager.registerCommand(
            "tomcat",       // domain name
            "getMemory",    // command name
            cmdGetMemory,   // command handler function
            false           // this command is synchronous
        );

        DomainManager.registerCommand(
            "tomcat",       // domain name
            "start",        // command name
            cmdStart,       // command handler function
            false           // this command is synchronous
        );

        DomainManager.registerCommand(
            "tomcat",       // domain name
            "stop",         // command name
            cmdStop,        // command handler function
            false           // this command is synchronous
        );

        DomainManager.registerCommand(
            "tomcat",       // domain name
            "getStatus",    // command name
            cmdGetStatus,   // command handler function
            false           // this command is synchronous
        );
    }

    exports.init = init;

}());

