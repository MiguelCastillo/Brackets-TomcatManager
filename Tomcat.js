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
        NodeConnection  = brackets.getModule("utils/NodeConnection");

    var _connection = null, instances = {};

    function init(connection) {
        _connection = connection;

        $(_connection).on("tomcat.started", function (evt, pid, success, data) {
            console.log("started");
            var instance = getRegisteredInstance(instances[pid]);
            $(instance).trigger("tomcat.started", [success, data]);
        });

        $(_connection).on("tomcat.stopped", function (evt, pid, success) {
            console.log("stopped", instances[pid]);
            if ( !instances[pid] ) {
                return;
            }

            var instance = getRegisteredInstance(instances[pid]);

            if ( instance.status === "stopping" ) {
                $(instance).trigger("tomcat.stopped", [true]);
            }

            $(instance).trigger("tomcat.exited", [instance.status === "stopping"]);
            instance.status = "stopped";
            deleteRegisteredInstance(instance);
        });

        $(_connection).on("tomcat.message", function (evt, pid, data) {
            var instance = getRegisteredInstance(instances[pid]);
            $(instance).trigger("tomcat.message", [data]);
        });
    }


    function start( server ) {
        function success(result) {
            var instance = $.extend({
                pid: result.pid
            }, server);

            registerInstance(instance);
            instance.status = "running";
            return instance;
        }

        return _connection.domains.tomcat.start(server).then(success, success);
    }


    function stop( instance ) {
        instance = getRegisteredInstance(instance);

        if ( !instance.pid ) {
            console.log("Warning", "Stopping an instance that's not registered");
        }
        else {
            instance.status = "stopping";
        }

        return _connection.domains.tomcat.stop( instance );
    }


    function getStatus( instance ) {
        return _connection.domains.tomcat.getStatus( instance )
            .fail(function (err) {
                console.error(err);
            })
            .done(function (result) {
                console.log(result);
            });
    }


    function registerInstance(instance) {
        instances[instance.pid] = instance;
        return instance;
    }


    function getRegisteredInstance(instance) {
        instance = instance || {};
        instance = instances[instance.pid] || {};
        return instance;
    }


    function deleteRegisteredInstance(instance) {
        instance = getRegisteredInstance(instance);
        delete instances[instance.pid];
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
