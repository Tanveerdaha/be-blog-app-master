
export const errorMiddleware = (err, req, res, next) => {

    const message = err.message || 'Internal Server Error!';
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({ success: false, statusCode, message });
};

export default errorMiddleware;