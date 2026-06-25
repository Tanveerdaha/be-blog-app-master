import userModel from "../model/userModel.js";
import asyncHandler from "express-async-handler";
import errorHandler from "../utils/errorHandler.js";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import nodemailer from 'nodemailer';





// Nodemailer Transport 

const transport = nodemailer.createTransport({
    service: 'Gmail',
    port: 465,
    secure: true,
    auth: {
        user: process.env.USER,
        pass: process.env.PASS
    }
});

// GET REQ  : Fetching User :
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
        )

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
            countUser: countUser,
        });
    } catch (error) {
        return next(errorHandler("An unexpected error occurred", 400));
    }
});

// POST REQ : Registering User :
export const registerUser = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    const userExist = await userModel.findOne({ email: email });

    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    if (userExist) {
        return next(errorHandler("User is already exist!", 400));
    } else {
        const registerUserInfo = await new userModel({
            username,
            email,
            password: hashedPassword,
        });
        try {
            await registerUserInfo.save();
            const { password, ...rest } = registerUserInfo._doc;
            return res.status(200).json({
                success: true,
                message: "User has been registered successfully",
                user: rest,
            });
        } catch (error) {
            console.log(error);
            return next(
                errorHandler(
                    "An unexpected error occurred while registering user!",
                    400
                )
            );
        }
    }
});

// POST REQ : Login User :

export const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    
    // Hardcoded admin credentials
    const ADMIN_EMAIL = "tanveer@gmail.com";
    const ADMIN_PASSWORD = "123321";
    
    // Check if login attempt is for admin with hardcoded credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Find or create admin user
        let adminUser = await userModel.findOne({ email: ADMIN_EMAIL });
        
        if (!adminUser) {
            // Create admin user if doesn't exist
            const genSalt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, genSalt);
            
            adminUser = await new userModel({
                username: "tanveer",
                email: ADMIN_EMAIL,
                password: hashedPassword,
                isAdmin: true,
                profilePicture: 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3485.jpg'
            }).save();
        }
        
        const createToken = JWT.sign({ id: adminUser.id }, process.env.JWT_TOKEN, {
            expiresIn: "30d",
        });
        
        const updateUser = await userModel.findByIdAndUpdate(
            { _id: adminUser.id },
            { token: createToken, isAdmin: true },
            { new: true }
        );

        if (updateUser) {
            const { password, ...rest } = updateUser._doc;
            return res
                .status(200)
                .cookie("accessToken", updateUser.token, { httpOnly: true, secure: true })
                .json({
                    status: 200,
                    success: true,
                    message: "Login successful",
                    user: rest,
                });
        }
    }
    
    // Regular user login
    const existUser = await userModel.findOne({ email: email });

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
        { _id: existUser.id },
        { token: createToken },
        { new: true }
    );

    if (updateUser) {
        const { password, ...rest } = updateUser._doc;
        return res
            .status(200)
            .cookie("accessToken", updateUser.token, { httpOnly: true, secure: true })
            .json({
                status: 200,
                success: true,
                message: "Login successful",
                user: rest,
            });
    }
});

// PUT REQ : Update User :

export const updateUser = asyncHandler(async (req, res, next) => {
    const paramsId = req.params.id;
    const userId = req.user.id;

    if (paramsId !== userId) {
        return next(
            errorHandler("Resources can not be accessed,Unauthorized user!", 401)
        );
    } else {
        let userInfo = {
            username: req.body.username,
            email: req.body.email,
        };
        if (req.file) {
             userInfo.profilePicture =
             `/uploads/${req.file.filename}`;
}
        try {
            if (req.body.password) {
                let genSalt = await bcrypt.genSalt(10);
                let hashedPassword = await bcrypt.hash(req.body.password, genSalt);
                userInfo.password = hashedPassword;
            }

            const updateUserInfo = await userModel.findByIdAndUpdate(
                paramsId,
                {
                    $set: userInfo,
                },
                { new: true }
            );

            const { password, ...rest } = updateUserInfo._doc;

            return res.status(200).json({
                message: "User has been updated",
                success: true,
                user: rest,
            });
        } catch (error) {
            return next("An unexpected error occurred while updating data", 500);
        }
    }
});

// POST req for Google firebase login :

export const googleOAuth = asyncHandler(async (req, res, next) => {
    const { username, email, profilePicture } = req.body;

    const user = await userModel.findOne({ email: email });

    if (user) {
        const createToken = JWT.sign({ id: user._id }, process.env.JWT_TOKEN, {
            expiresIn: "30d",
        });

        const updateUser = await userModel.findByIdAndUpdate(
            { _id: user._id },
            { token: createToken },
            { new: true }
        );

        const { password, ...rest } = updateUser._doc;

        return res
            .status(200)
            .cookie("accessToken", createToken, { httpOnly: true })
            .json({
                success: true,
                message: "User has been successfully loggedIn",
                user: rest,
            });
    } else {
        const generatePassword =
            100 * Math.random().toString().replace(".", "") +
            process.env.JWT_TOKEN.slice(20);

        try {
            const genSalt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(generatePassword, genSalt);
            const modifiedName = username.toLowerCase().replace(/\s/g, "");

            const loginGoogleUser = new userModel({
                username: modifiedName,
                email: email,
                profilePicture: profilePicture,
                password: hashedPassword,
            });
            await loginGoogleUser.save();

            const createToken = JWT.sign(
                { id: loginGoogleUser._id },
                process.env.JWT_TOKEN
            );

            const updateUser = await userModel.findByIdAndUpdate(
                { _id: loginGoogleUser._id },
                { token: createToken },
                { new: true }
            );

            const { password, ...rest } = updateUser._doc;

            return res
                .status(200)
                .cookie("accessToken", createToken, { httpOnly: true })
                .json({
                    success: true,
                    message: "User has been loggedIn",
                    user: rest,
                });
        } catch (error) {
            console.log(error);
            return next(errorHandler(error));
        }
    }
});

// DELETE Api for deleting user :

export const deleteUser = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { isAdmin } = req.body.user;


    if (!isAdmin && userId !== id) {
        return next(errorHandler("Unauthorized user!", 401));
    }
    try {
        await userModel.findByIdAndDelete({ _id: id });

        return res.status(200).json({
            success: true,
            message: "User has been deleted",
        });
    } catch (error) {
        return next(errorHandler('An unexpected error occurred while deleting user!', 400))
    }


});

// POST req for user SignOut :

export const signOutUser = asyncHandler(async (req, res, next) => {
    try {
        res.clearCookie("accessToken").json({
            success: true,
            message: "User has been signedOut",
        });
    } catch (error) {
        return next(errorHandler(error));
    }
});



// POST req for reset the password of user :

export const userResetPassword = asyncHandler(async (req, res, next) => {

    const { email } = req.body;

    try {
        const user = await userModel.findOne({ email: email });

        if (!user) {
            return next(errorHandler('Oops, Email is not found!', 401))
        } else {

            // Todo .......................................................................

            const generateToken = await JWT.sign({ _id: user._id }, process.env.JWT_TOKEN, { expiresIn: '30d' });

            const setPasswordToken = await userModel.findByIdAndUpdate({ _id: user._id }, { resetPasswordToken: generateToken }, { new: true });

            if (setPasswordToken) {

            }
        }
    } catch (error) {

    }
})




// GET API : public route : 

export const getComment = asyncHandler(async (req, res, next) => {

    const { commentUserId } = req.params;

    try {
        const comment = await userModel.findById({ _id: commentUserId });

        if (!comment) {
            return next(errorHandler('Comment not found!', 404));
        }
        const { password, ...rest } = comment._doc;
        return res.status(200).json(rest);
    } catch (error) {
        console.log(error);
    }
})