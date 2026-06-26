import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
    getUser,
    registerUser,
    loginUser,
    updateUser,
    googleOAuth,
    deleteUser,
    signOutUser,
    userResetPassword,
    confirmResetPassword,
    getComment,
    getPublicProfile,
    setUserAdminRole
} from "../controller/userController.js";
import verifyUserMiddleware from "../middleware/verifyUserMiddleware.js";
import verifyAdminMiddleware from "../middleware/verifyAdminMiddleware.js";
import loadUserMiddleware from "../middleware/loadUserMiddleware.js";

const userRouter = express.Router();

userRouter
    .post("/register", registerUser)
    .post("/login", loginUser)
    .put("/updateuser/:id", verifyUserMiddleware, upload.single("profilePicture"), updateUser)
    .post("/googleuser", googleOAuth)
    .delete("/deleteuser/:id", verifyUserMiddleware, loadUserMiddleware, deleteUser)
    .post("/signoutuser", signOutUser)
    .get("/getusers", verifyUserMiddleware, verifyAdminMiddleware, getUser)
    .patch("/:id/admin-role", verifyUserMiddleware, verifyAdminMiddleware, setUserAdminRole)
    .post("/reset-password", userResetPassword)
    .post("/confirm-reset-password", confirmResetPassword)
    .get('/get-user-comment/:commentUserId', getComment)
    .get('/profile/:username', getPublicProfile);

export default userRouter;
