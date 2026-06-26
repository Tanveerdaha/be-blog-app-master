import userModel from '../model/userModel.js';

const attachAuthorsToBlogs = async (blogs) => {
    return Promise.all(
        blogs.map(async (blog) => {
            const blogData = blog.toObject ? blog.toObject() : blog;
            const author = await userModel.findById(blogData.userId).select('username profilePicture');

            return {
                ...blogData,
                authorUsername: author?.username || 'Unknown',
                authorProfilePicture: author?.profilePicture || '',
            };
        })
    );
};

export default attachAuthorsToBlogs;
