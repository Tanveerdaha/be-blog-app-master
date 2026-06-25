
const errorHandler = (message, statusCode) => {

    const error = new Error();
    error.message = message;
    error.statusCode = statusCode;

    return error;
};

export default errorHandler;