import userModel from '../model/userModel.js';
import errorHandler from '../utils/errorHandler.js';
import asyncHandler from 'express-async-handler';

const verifyAdminMiddleware = asyncHandler(async (req, res, next) => {
    const user = await userModel.findById(req.user.id);

    if (!user || !user.isAdmin) {
        return next(errorHandler('Unauthorized - Admin access required', 403));
    }

    req.dbUser = user;
    next();
});

export default verifyAdminMiddleware;
