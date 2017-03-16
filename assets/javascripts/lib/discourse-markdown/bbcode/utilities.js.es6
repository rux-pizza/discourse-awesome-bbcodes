// check if string or number
const isStringy = function(arg) {
  return typeof arg === 'string' || typeof arg === 'number';
};

// check if array
const isArray = Array.isArray || function(arg) {
    return toString.call(arg) === '[object Array]';
  };

export {isStringy, isArray};
