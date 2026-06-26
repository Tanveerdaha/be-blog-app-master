import errorHandler from "../utils/errorHandler.js";
import asyncHandler from 'express-async-handler';
import blogModel from "../model/blogModel.js";
import escapeRegex from "../utils/escapeRegex.js";
import attachAuthorsToBlogs from "../utils/attachBlogAuthors.js";

const getBlogImagePath = (req, existingImage) => {
    if (req.file) {
        return `/uploads/${req.file.filename}`;
    }
    return req.body.blogImgFile || existingImage;
};

export const getAllBlogs = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limitBlogs = parseInt(req.query.limit) || 8;
    const sortBlog = req.query.sort === 'asc' ? 1 : -1;
    const skipBlogs = (page - 1) * limitBlogs;

    const filterBlogs = {
        ...(req.query.userId && { userId: req.query.userId }),
        ...(req.query.category && req.query.category !== 'all' && {
            blogCategory: { $regex: new RegExp(`^${escapeRegex(req.query.category)}$`, 'i') }
        }),
        ...(req.query.slug && { slug: req.query.slug }),
        ...(req.query.blogId && { _id: req.query.blogId }),
        ...(req.query.searchBlog && req.query.searchBlog.trim() && {
            $or: [
                { blogTitle: { $regex: escapeRegex(req.query.searchBlog.trim()), $options: 'i' } },
                { blogBody: { $regex: escapeRegex(req.query.searchBlog.trim()), $options: 'i' } }
            ]
        })
    };

    try {
        const blogs = await blogModel.find(filterBlogs).skip(skipBlogs).sort({ updatedAt: sortBlog }).limit(limitBlogs);
        const blogsWithAuthors = await attachAuthorsToBlogs(blogs);
        const countBlogs = await blogModel.countDocuments(filterBlogs);

        const currentDate = new Date();
        const oneMonthAgo = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            currentDate.getDate()
        );

        const lastMonthBlogs = await blogModel.countDocuments({
            createdAt: { $gte: oneMonthAgo }
        });

        return res.status(200).json({
            success: true,
            message: 'Blogs have been fetched',
            lastMonthBlogs,
            countBlogs,
            blogs: blogsWithAuthors
        });
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});

export const postBlog = asyncHandler(async (req, res, next) => {
    const { blogTitle, blogCategory, blogBody } = req.body;

    if (!blogTitle || !blogBody) {
        return next(errorHandler('Blog title and body are required', 400));
    }

    const slug = blogTitle.trim().toLowerCase().replace(/\s+/g, '-');

    const addBlogPost = new blogModel({
        blogTitle,
        blogCategory,
        blogImgFile: getBlogImagePath(req),
        blogBody,
        userId: req.dbUser._id.toString(),
        slug
    });

    try {
        await addBlogPost.save();
        const [blogWithAuthor] = await attachAuthorsToBlogs([addBlogPost]);

        return res.status(200).json({
            success: true,
            message: 'Blog has been created',
            slug,
            blog: blogWithAuthor
        });
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});

export const deleteBlog = asyncHandler(async (req, res, next) => {
    const { blogid } = req.params;
    const blog = await blogModel.findById(blogid);

    if (!blog) {
        return next(errorHandler('Blog not found', 404));
    }

    const isOwner = blog.userId.toString() === req.user.id;
    const isAdmin = req.dbUser?.isAdmin;

    if (!isAdmin && !isOwner) {
        return next(errorHandler('You are not allowed to delete the blog', 401));
    }

    try {
        await blogModel.findByIdAndDelete(blogid);
        return res.status(200).json({
            success: true,
            message: 'Blog has been deleted'
        });
    } catch (error) {
        return next(errorHandler('An error occurred while deleting the blog!', 400));
    }
});

export const updateBlog = asyncHandler(async (req, res, next) => {
    const blog = await blogModel.findById(req.params.blogid);

    if (!blog) {
        return next(errorHandler('Blog not found', 404));
    }

    const isOwner = blog.userId.toString() === req.user.id;

    if (!isOwner) {
        return next(errorHandler('You can only edit your own blogs', 401));
    }

    const updatedBlog = await blogModel.findByIdAndUpdate(
        req.params.blogid,
        {
            $set: {
                blogTitle: req.body.blogTitle,
                blogCategory: req.body.blogCategory,
                blogImgFile: getBlogImagePath(req, blog.blogImgFile),
                blogBody: req.body.blogBody
            }
        },
        { new: true }
    );

    const [blogWithAuthor] = await attachAuthorsToBlogs([updatedBlog]);

    return res.status(200).json({
        success: true,
        message: 'Blog has been updated',
        blog: blogWithAuthor
    });
});
