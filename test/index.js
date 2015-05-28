"use strict";

var request = require("request"),
	async = require("async");

var fail = function(msg) {
	throw new Error(msg);
	process.exit(1);
}

function test_that_configuration_must_be_supplied(next) {
	var errStr = "Kardia cannot start - configuration not supplied";
	console.log("Expecting "+errStr);
	try {
		var Kardia = require("..");
		Kardia.start();
		return fail("Test failed - expected \""+errStr+"\" to be raised.");
	}
	catch (err) {
		if (err && err.toString().match(/configuration not supplied/i) === null) {
			return fail("Test failed - expected \""+errStr+"\" to be raised.");
		}
	}

	next();
}

function test_that_name_must_be_supplied(next) {
	var errStr = "Kardia cannot start - service name must be supplied";
	console.log("Expecting "+errStr);
	try {
		var Kardia = require("..");
		Kardia.start({});
		return fail("Test failed - expected \""+errStr+"\" to be raised.");
	}
	catch (err) {
		if (err && err.toString().match(/service name must be supplied/i) === null) {
			return fail("Test failed - expected \""+errStr+"\" to be raised.");
		}
	}

	next();
}

function test_that_server_is_running(next) {
	var Kardia = require("..");
	var serviceName = "test-" + new Date().toISOString();
	var kardiaInstance = Kardia.start({ name: serviceName, port: 12809 });

	setTimeout(function() {
		request("http://127.0.0.1:12809", function(err, res, body) {
			if (err) throw err;
			var data = JSON.parse(body);

			if (!data || !data.pid || !data.service) {
				fail("Expected Kardia to respond with JSON data, including \"pid\", \"service\", instead got: "+body);
			}

			if (data.service != serviceName) {
				fail("Kardia responded with incorrect service name.");
			}

			if (data.pid != process.pid) {
				fail("Kardia responded with incorrect pid.");
			}

			kardiaInstance.stopServer();

			next();
		});
	}, 100);
}

function test_that_server_running_on_right_port(next) {
	var Kardia = require("..");
	var serviceName = "test-" + new Date().toISOString();
	var kardiaInstance = Kardia.start({ name: serviceName, port: 12813 });
	kardiaInstance.server.on("listening", function(){
		var connectionKey = this._connectionKey;
		if (!connectionKey.match(/:12813$/)) {
			console.log("fail1");
			fail("Kardia ignore option port");
		}
		kardiaInstance.stopServer();

		next();
	});
}

function test_that_server_running_on_right_host(next) {
	var Kardia = require("..");
	var serviceName = "test-" + new Date().toISOString();
	var kardiaInstance = Kardia.start({ name: serviceName, port: 12814, host: '127.0.0.1' });
	kardiaInstance.server.on("listening", function(){
		var connectionKey = this._connectionKey;
		if (!connectionKey.match(/:127\.0\.0\.1:/)) {
			fail("Kardia ignore option host");
		}
		kardiaInstance.stopServer();

		next();
	});
}

function test_that_counters_can_be_modified(next) {
	var Kardia = require("..");
	var serviceName = "test-" + new Date().toISOString();
	var kardiaInstance = Kardia.start({ name: serviceName, port: 12810 });

	kardiaInstance.increment("test-counter", 1);
	kardiaInstance.increment("test-counter", 3);
	kardiaInstance.increment("test-counter", 0);
	kardiaInstance.decrement("test-counter", 1);

	setTimeout(function() {
		request("http://127.0.0.1:12810", function(err, res, body) {
			if (err) throw err;
			var data = JSON.parse(body);

			if (!data.counters || !data.counters["test-counter"]) {
				fail("Expected test-counter to exist in response from Kardia");
			}

			if (data.counters["test-counter"] !== 4) {
				fail("Expected test-counter to equal 4 in response from Kardia");
			}

			kardiaInstance.stopServer();

			next();
		});
	}, 100);
}

function test_that_stacks_are_not_growing_beyond_size(next) {
	var Kardia = require("..");
	var serviceName = "test-" + new Date().toISOString();
	var kardiaInstance = Kardia.start({ name: serviceName, port: 12812 });

	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 3);
	kardiaInstance.stack("test-stack15", 0);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 3);
	kardiaInstance.stack("test-stack15", 0);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 3);
	kardiaInstance.stack("test-stack15", 0);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 1);
	kardiaInstance.stack("test-stack15", 99);

	kardiaInstance.startStack("test-stack2", 2);
	kardiaInstance.stack("test-stack2", 1);
	kardiaInstance.stack("test-stack2", 1);
	kardiaInstance.stack("test-stack2", 99);

	setTimeout(function() {
		request("http://127.0.0.1:12812", function(err, res, body) {
			if (err) throw err;
			var data = JSON.parse(body);

			if (!data.stacks || !data.stacks["test-stack15"]) {
				fail("Expected test-stack15 to exist in response from Kardia");
			}

			if (data.stacks["test-stack15"].length !== 15) {
				fail("Expected test-stack15 length to equal 15 in response from Kardia, saw " + data.stacks["test-stack15"].length + " instead");
			}

			if (!data.stacks || !data.stacks["test-stack2"]) {
				fail("Expected test-stack2 to exist in response from Kardia");
			}

			if (data.stacks["test-stack2"].length !== 2) {
				fail("Expected test-stack2 length to equal 2 in response from Kardia, saw " + data.stacks["test-stack2"].length + " instead");
			}

			kardiaInstance.stopServer();

			next();
		});
	}, 100);
}

function test_that_static_values_can_be_applied(next) {
	var Kardia = require("..");
	var serviceName = "test-" + new Date().toISOString();
	var kardiaInstance = Kardia.start({ name: serviceName, port: 12811 });

	kardiaInstance.set("test-value", { specific: "value" });

	setTimeout(function() {
		request("http://127.0.0.1:12811", function(err, res, body) {
			if (err) throw err;
			var data = JSON.parse(body);

			// a little test that the server is in fact a new one, not the one from any of the previous tests:
			if (data.counters && data.counters["test-counter"]) {
				fail("Did not expect test-counter to exist in response from Kardia");
			}

			if (!data.values || !data.values["test-value"] || typeof data.values["test-value"] !== "object") {
				fail("Expected test-value to exist in response from Kardia. and be an object");
			}

			if (data.values["test-value"]["specific"] !== "value") {
				fail("Expected test-value[specific] to equal \"value\" in response from Kardia");
			}

			kardiaInstance.stopServer();

			next();
		});
	}, 100);
}

function tests_completed() {
	console.log("=========================")
	console.log("OK! All tests passed.");
	process.exit();
}

async.series([
	test_that_configuration_must_be_supplied,
	test_that_name_must_be_supplied,
	test_that_server_is_running,
	test_that_server_running_on_right_port,
	test_that_server_running_on_right_host,
	test_that_counters_can_be_modified,
	test_that_static_values_can_be_applied,
	test_that_stacks_are_not_growing_beyond_size,
	tests_completed
]);