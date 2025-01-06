// GET USER INFO
const getUserController = async (req, res) => {
    res.status(200).send("todo bien");
    // try {
    //     const user = await userModel.findById(req.user.id).select('-password');
    //     if (!user) {
    //         return res.status(400).send({ 
    //             success: false,
    //             message: 'User not found' });
    //     }
    //     res.status(200).send({ 
    //         success: true,
    //         message: 'User found',
    //         user });
    // }
    // catch (error) {
    //     console.log('Internal get user error', error);
    // }
}

module.exports = { getUserController }