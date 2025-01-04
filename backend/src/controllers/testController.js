const testUserController = (req, res) => {
  try {
    res.status(200).json({
      message: 'Test user controller works!',
    })
  } catch (error) {
      console.log('Internal server error', error);
  }
  };

module.exports = testUserController;