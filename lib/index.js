var net = require('net'),
 		kue = require('kue');

module.exports = proxy = {};

proxy.queue = null;
proxy.sockets = {};

proxy.start = function (config) {
	var redisConfig = {
		port: config.kue.port,
		host: config.kue.host,
		db: config.kue.db
	};

	if (config.kue.pass) {
		redisConfig.auth = config.kue.pass;
	}

	// Create the queue with config options
	proxy.queue = kue.createQueue({
		prefix: config.kue.prefix,
		redis: redisConfig
	});

	proxy.queue.process(config.jobType, proxy.process);
};

proxy.process = function (job, done) {
	var error, socket, key, host, port, newSocket, response = false;

	if (job.data.keepAlive) {
		return done();
	}

	host = job.data.host;
	port = job.data.port;

	if (!host || !port) {
		error = new Error('Invalid host or port. host: ' + host + ', port: ' + port);
		return done(error);
	}

	key = host + ':' + port;

	socket = proxy.sockets[key];

	if (!socket) {
		newSocket = true;
		socket = new net.Socket();

    proxy.sockets[key] = socket;

		socket.on('close', function () {
			console.log('Proxy connection closed for host: ' + host + ', port: ' + port);
			delete proxy.sockets[key];
      socket.destroy();
		});
	}

  var removeListeners = function () {
    socket.removeAllListeners('data');
    socket.removeAllListeners('error');
    socket.removeAllListeners('timeout');
  };

	var finish = function (err, res) {
    response = true;
		removeListeners();
		return done(err, res);
	};

	socket.on('data', function (data) {
		finish(null, data);
	});

	socket.on('error', finish);

  socket.setTimeout(5000);

  socket.on('timeout', function () {
    removeListeners();
  });

	if (newSocket) {
		socket.connect(port, host);
	}

	socket.write(job.data.payload);

};
