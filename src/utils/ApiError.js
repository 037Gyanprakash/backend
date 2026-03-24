// custom error class for api errors
// it extends the built-in Error class and adds additional properties such as statusCode, data, success, and errors.
// This class can be used to create consistent error responses throughout the application, 
// making it easier to handle and debug errors.

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);

        this.statusCode = statusCode;
        this.success = false;
        this.data = null;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };