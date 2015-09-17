var config = {
	kue: {
    host: process.env.KUE_HOST || 'localhost',
    port: process.env.KUE_PORT || '6379',
    db: process.env.KUE_DB || 0,
    pass: process.env.KUE_PASS || null,
    prefix: process.env.KUE_PREFIX || 'q'
  },
  jobType: process.env.JOB_TYPE || 'TCP_PROXY'
};

module.exports = config;
