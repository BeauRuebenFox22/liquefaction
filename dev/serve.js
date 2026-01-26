module.exports = function (componentString) {
  const components = componentString 
    ? componentString.split(',').map(c => c.trim()) 
    : [];
};

module.exports = function () {
  require('../backend/server');
};