import userModel from "../model/userModel.js";
import blogModel from "../model/blogModel.js";
import asyncHandler from "express-async-handler";
import errorHandler from "../utils/errorHandler.js";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import nodemailer from 'nodemailer';
import { verifyFirebaseIdToken } from "../utils/firebaseAdmin.js";

const getMailTransport = () => {
    if (!process.env.USER || !process.env.PASS) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'Gmail',
        port: 465,
        secure: true,
        auth: {
            user: process.env.USER,
            pass: process.env.PASS
        }
    });
};

export const getUser = asyncHandler(async (req, res, next) => {
    try {
        const countUser = await userModel.countDocuments();
        const startIndex = parseInt(req.query.page) || 1;
        const showUserPerPage = parseInt(req.query.user) || 9;
        const sortUser = req.query.sortUser === "asc" ? 1 : -1;
        const skipUser = (startIndex - 1) * showUserPerPage;

        const userInfo = await userModel.find()
            .skip(skipUser)
            .sort({ updatedAt: sortUser })
            .limit(showUserPerPage);

        const currentDate = new Date();
        const oneMonthAgo = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            currentDate.getDate()
        );

        const lastMonthUsers = await userModel.countDocuments({
            createdAt: { $gte: oneMonthAgo }
        });

        const userWithoutPassword = userInfo.map((user) => {
            const { password, ...rest } = user._doc;
            return rest;
        });

        return res.status(200).json({
            success: true,
            message: "user has been fetched",
            lastMonthUsers,
            user: userWithoutPassword,
            countUser,
        });
    } catch (error) {
        return next(errorHandler("An unexpected error occurred", 400));
    }
});

export const registerUser = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return next(errorHandler("Username, email, and password are required!", 400));
    }

    const userExist = await userModel.findOne({ email });

    if (userExist) {
        return next(errorHandler("User is already exist!", 400));
    }

    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    const registerUserInfo = new userModel({
        username,
        email,
        password: hashedPassword,
    });

    try {
        await registerUserInfo.save();
        const { password: _, ...rest } = registerUserInfo._doc;
        return res.status(200).json({
            success: true,
            message: "User has been registered successfully",
            user: rest,
        });
    } catch (error) {
        return next(
            errorHandler(
                "An unexpected error occurred while registering user!",
                400
            )
        );
    }
});

export const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(errorHandler("Email and password are required", 400));
    }

    const existUser = await userModel.findOne({ email });

    if (!existUser) {
        return next(errorHandler("User not found", 401));
    }

    const matchPassword = await bcrypt.compare(password, existUser.password);

    if (!matchPassword) {
        return next(errorHandler("Invalid password", 401));
    }

    const createToken = JWT.sign({ id: existUser.id }, process.env.JWT_TOKEN, {
        expiresIn: "30d",
    });

    const updateUser = await userModel.findByIdAndUpdate(
        existUser.id,
        { token: createToken },
        { new: true }
    );

    const { password: _, ...rest } = updateUser._doc;
    return res
        .status(200)
        .cookie("accessToken", updateUser.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })
        .json({
            status: 200,
            success: true,
            message: "Login successful",
            user: rest,
        });
});

export const updateUser = asyncHandler(async (req, res, next) => {
    const paramsId = req.params.id;
    const userId = req.user.id;

    if (paramsId !== userId) {
        return next(
            errorHandler("Resources can not be accessed, Unauthorized user!", 401)
        );
    }

    const userInfo = {
        username: req.body.username,
        email: req.body.email,
    };

    if (req.file) {
        userInfo.profilePicture = `/uploads/${req.file.filename}`;
    }

    try {
        if (req.body.password) {
            const genSalt = await bcrypt.genSalt(10);
            userInfo.password = await bcrypt.hash(req.body.password, genSalt);
        }

        const updateUserInfo = await userModel.findByIdAndUpdate(
            paramsId,
            { $set: userInfo },
            { new: true }
        );

        const { password: _, ...rest } = updateUserInfo._doc;

        return res.status(200).json({
            message: "User has been updated",
            success: true,
            user: rest,
        });
    } catch (error) {
        return next(errorHandler("An unexpected error occurred while updating data", 500));
    }
});

export const googleOAuth = asyncHandler(async (req, res, next) => {
    const { idToken, username, email, profilePicture } = req.body;

    if (!idToken) {
        return next(errorHandler("Firebase ID token is required", 401));
    }

    let decodedToken;
    try {
        decodedToken = await verifyFirebaseIdToken(idToken);
    } catch (error) {
        return next(errorHandler("Invalid Google authentication token", 401));
    }

    if (decodedToken.email !== email) {
        return next(errorHandler("Email does not match authentication token", 401));
    }

    let user = await userModel.findOne({ email });

    if (user) {
        const createToken = JWT.sign({ id: user._id }, process.env.JWT_TOKEN, {
            expiresIn: "30d",
        });

        const updateUser = await userModel.findByIdAndUpdate(
            user._id,
            { token: createToken },
            { new: true }
        );

        const { password: _, ...rest } = updateUser._doc;

        return res
            .status(200)
            .cookie("accessToken", createToken, { httpOnly: true })
            .json({
                success: true,
                message: "User has been successfully loggedIn",
                user: rest,
            });
    }

    const generatePassword =
        100 * Math.random().toString().replace(".", "") +
        process.env.JWT_TOKEN.slice(20);

    try {
        const genSalt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(generatePassword, genSalt);
        const modifiedName = (username || decodedToken.name || 'user').toLowerCase().replace(/\s/g, "");

        const loginGoogleUser = new userModel({
            username: modifiedName,
            email,
            profilePicture: profilePicture || decodedToken.picture,
            password: hashedPassword,
        });
        await loginGoogleUser.save();

        const createToken = JWT.sign(
            { id: loginGoogleUser._id },
            process.env.JWT_TOKEN,
            { expiresIn: "30d" }
        );

        const updateUser = await userModel.findByIdAndUpdate(
            loginGoogleUser._id,
            { token: createToken },
            { new: true }
        );

        const { password: _, ...rest } = updateUser._doc;

        return res
            .status(200)
            .cookie("accessToken", createToken, { httpOnly: true })
            .json({
                success: true,
                message: "User has been loggedIn",
                user: rest,
            });
    } catch (error) {
        return next(errorHandler(error.message || "Google login failed", 400));
    }
});

export const setUserAdminRole = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
        return next(errorHandler('isAdmin must be a boolean', 400));
    }

    const targetUser = await userModel.findById(id);

    if (!targetUser) {
        return next(errorHandler('User not found', 404));
    }

    if (!isAdmin && targetUser.isAdmin) {
        const adminCount = await userModel.countDocuments({ isAdmin: true });

        if (adminCount <= 1) {
            return next(errorHandler('Cannot remove the last admin', 400));
        }
    }

    const updatedUser = await userModel.findByIdAndUpdate(
        id,
        { isAdmin },
        { new: true }
    );

    const { password: _, token: __, resetPasswordToken: ___, ...rest } = updatedUser._doc;

    return res.status(200).json({
        success: true,
        message: isAdmin ? 'User promoted to admin' : 'Admin access removed',
        user: rest
    });
});

export const deleteUser = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    const isAdmin = req.dbUser?.isAdmin;

    if (!isAdmin && userId !== id) {
        return next(errorHandler("Unauthorized user!", 401));
    }

    try {
        await userModel.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "User has been deleted",
        });
    } catch (error) {
        return next(errorHandler('An unexpected error occurred while deleting user!', 400));
    }
});

export const signOutUser = asyncHandler(async (req, res, next) => {
    try {
        res.clearCookie("accessToken").json({
            success: true,
            message: "User has been signedOut",
        });
    } catch (error) {
        return next(errorHandler(error.message, 500));
    }
});

export const userResetPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(errorHandler('Email is required', 400));
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return next(errorHandler('Oops, Email is not found!', 401));
        }

        const generateToken = JWT.sign(
            { id: user._id },
            process.env.JWT_TOKEN,
            { expiresIn: '1h' }
        );

        await userModel.findByIdAndUpdate(user._id, { resetPasswordToken: generateToken });

        const transport = getMailTransport();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${generateToken}`;

        if (transport) {
            await transport.sendMail({
                from: process.env.USER,
                to: email,
                subject: 'Password Reset Request',
                html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${resetLink}">${resetLink}</a>`
            });
        }

        return res.status(200).json({
            success: true,
            message: transport
                ? 'Password reset link has been sent to your email'
                : 'Password reset token generated. Check server logs or configure email.',
            ...(process.env.NODE_ENV !== 'production' && !transport ? { resetLink } : {})
        });
    } catch (error) {
        return next(errorHandler(error.message || 'Failed to reset password', 500));
    }
});

export const confirmResetPassword = asyncHandler(async (req, res, next) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return next(errorHandler('Token and new password are required', 400));
    }

    try {
        const decoded = JWT.verify(token, process.env.JWT_TOKEN);
        const user = await userModel.findOne({ _id: decoded.id, resetPasswordToken: token });

        if (!user) {
            return next(errorHandler('Invalid or expired reset token', 401));
        }

        const genSalt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, genSalt);

        await userModel.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            resetPasswordToken: null
        });

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        return next(errorHandler('Invalid or expired reset token', 401));
    }
});

export const getComment = asyncHandler(async (req, res, next) => {
    const { commentUserId } = req.params;

    try {
        const comment = await userModel.findById(commentUserId);

        if (!comment) {
            return next(errorHandler('Comment not found!', 404));
        }

        const { password: _, ...rest } = comment._doc;
        return res.status(200).json(rest);
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});

export const getPublicProfile = asyncHandler(async (req, res, next) => {
    const { username } = req.params;

    try {
        const user = await userModel.findOne({ username });

        if (!user) {
            return next(errorHandler('User not found', 404));
        }

        const { password: _, token: __, resetPasswordToken: ___, email: ____, ...publicUser } = user._doc;

        const blogs = await blogModel.find({ userId: user._id.toString() })
            .sort({ updatedAt: -1 })
            .select('blogTitle blogCategory blogImgFile slug createdAt updatedAt userId');

        return res.status(200).json({
            success: true,
            user: publicUser,
            blogs
        });
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});
