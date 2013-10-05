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

define(function(require, exports, module) {
    "use strict";

    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        NodeConnection  = brackets.getModule("utils/NodeConnection"),
        configurations  = require("ConfigurationManager");

    var _connection = null;

    function init(connection) {
        _connection = connection;

        $(_connection).on("tomcat.started", function (evt, pid, success, data) {
            var server = getRegisteredServer(pid);
            //console.log("started", pid, server);
            
            updateServerStatus(server, "running");
            $(server).trigger("tomcat.started", [success, data]);
        });

        $(_connection).on("tomcat.stopped", function (evt, pid, success) {
            var server = getRegisteredServer(pid);
            //console.log("stopped", pid, server);
            
            if ( !server ) {
                return;
            }

            var serverStatus = getServerStatus(server);
            
            if ( serverStatus === "stopping" ) {
                $(server).trigger("tomcat.stopped", [true]);
            }

            $(server).trigger("tomcat.exited", [serverStatus === "stopping"]);
            deleteRegisteredServer(server);
        });

        $(_connection).on("tomcat.message", function (evt, pid, data) {
            var server = getRegisteredServer(pid);
            //console.log("message", pid, server);
            $(server).trigger("tomcat.message", [data]);
        });
    }


    function start( server ) {
        var AppServer = configurations.getAppServer(server);

        // Handle passing in a server name        
        if ( typeof server === "string" ) {
            server = configurations.getServer(server);
        }

        var settings = $.extend({}, server, {AppServer: AppServer});

        function success(result) {
            registerServer(server, {
                status: "starting",
                pid: result.pid,
                AppServer: result.AppServer
            });

            return server;
        }

        return _connection.domains.tomcat.start( settings ).then(success);
    }


    function stop( server ) {
        server = getRegisteredServer(server);

        if ( !server._instance.pid ) {
            console.log("Warning", "Stopping an instance that's not registered");
        }
        else {
            updateServerStatus(server, "stopping");
        }

        return _connection.domains.tomcat.stop( server._instance );
    }


    function getStatus( server ) {
        return _connection.domains.tomcat.getStatus( server )
            .fail(function (err) {
                console.error(err);
            })
            .done(function (result) {
                console.log(result);
            });
    }


    function getServerStatus(server) {
        return (server._instance ? server._instance : {}).status;
    }
    

    function updateServerStatus(server, status) {
        server._instance.status = status;
        configurations.saveConfiguration();
    }


    function getRegisteredServer(server) {
        var pid = -1;

        if ( typeof server === "number" || typeof server === "string" ) {
            pid = server;
        }
        else if ( typeof server === "object" && server._instance ) {
            pid = server._instance.pid;
        }

        if ( pid !== -1 ) {
            var servers = configurations.getServers();
            for (var iServer in servers) {
                if ( servers[iServer]._instance && servers[iServer]._instance.pid == pid) {
                    return servers[iServer];
                }
            }
        }
        
        return false;
    }


    function registerServer(server, instance) {
        server._instance = instance;
        configurations.saveConfiguration();
        return server;
    }


    function deleteRegisteredServer(server) {
        delete server._instance;
        configurations.saveConfiguration();
    }


    //
    // Init node connection as needed by brackets
    //
    function initNodeConnetion() {
        // Create a new node connection. Requires the following extension:
        // https://github.com/joelrbrandt/brackets-node-client
        var nodeConnection = new NodeConnection();

        // Every step of communicating with node is asynchronous, and is
        // handled through jQuery promises. To make things simple, we
        // construct a series of helper functions and then chain their
        // done handlers together. Each helper function registers a fail
        // handler with its promise to report any errors along the way.


        // Helper function to connect to node
        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("Tomcat Manager failed to connect to node");
            });
            return connectionPromise;
        }


        // Helper function that loads our domain into the node server
        function loadTomcatDomain() {
            var path = ExtensionUtils.getModulePath(module, "node/TomcatDomain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                console.log("Tomcat Manager failed to load domain");
            });
            return loadPromise;
        }


        return connect().then(loadTomcatDomain).then(function() {
            return nodeConnection;
        });
    }


    return {
        ready: initNodeConnetion().then(init).done,
        start: start,
        stop: stop,
        getStatus: getStatus
    };
});
