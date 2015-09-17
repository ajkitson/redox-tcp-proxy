var net = require('net'),
 		kue = require('kue');

module.exports = proxy = {};

proxy.queue = null;
proxy.sockets = {};

proxy.start = function (config) {
  console.log('Starting proxy');
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
  console.log('Proxy started and listening for jobs');
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

	var finish = function (err, res) {
    response = true;
    socket.removeAllListeners('data');
    socket.removeAllListeners('error');
		return done(err, res);
	};

	socket.on('data', function (data) {
		finish(null, data);
	});

	socket.on('error', finish);

	if (newSocket) {
    socket.connect(port, host);

    socket.on('connect', function () {
      console.log('Proxy connection established for host: ' + host + ', port: ' + port);
    });
	}

	socket.write(job.data.payload);

  setTimeout(function(){
    if (!response) {
      socket.destroy();
      delete proxy.sockets[key];
      return done(new Error('TCP timeout occured to ' + host + ':' + port));
    }
  }, 5000);

};
