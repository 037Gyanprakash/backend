import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse }  from "../utils/ApiResponse.js";
import req from "express/lib/request.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false });
        // console.log("Generated Access Token:", accessToken)
        // console.log("Generated Refresh Token:", refreshToken)

        return { accessToken, refreshToken }

    } catch (error) {
        // console.log(error)
        throw new ApiError(500, "Failed to generate access and refresh token")
    }
} 



const registerUser = asyncHandler(async (req, res) => {
   const {fullname, email, username, password } = req.body || {};

   if(
      [fullname, email, username, password].some((field) => field?.trim() === "" )
   ){
       throw new ApiError(400, "All fields are required")
   }

   const existedUser = await User.findOne({
        $or: [{username}, {email}]
   })

   if(existedUser){
        throw new ApiError(409, "User with the same email or username already exists")
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if( !avatarLocalPath ) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatarUploadResponse = await uploadOnCloudinary(avatarLocalPath)
    const coverImageUploadResponse = await uploadOnCloudinary(coverImageLocalPath)
    
    if( !avatarUploadResponse ) {
        throw new ApiError(500, "failed to upload avatar image on cloudinary")
    }

   const user = await User.create({
        fullname,
        avatar: avatarUploadResponse.url,
        coverImage: coverImageUploadResponse?.url || "",
        email,
        username: username.toLowerCase() || "",
        password
    })


   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
     throw new ApiError(500, "Failed to create user")
   }

   return res.status(201).json(
    new ApiResponse (200, createdUser, "User created successfully")
   )
})



const loginUser = asyncHandler(async(req, res) => {
    // req body -> data
    //username or email
    //find user
    //passweord check
    //generate access and refresh token
    //send cookie and response



    const { email, username, password } = req.body || {};

    if(!email && !username){
        throw new ApiError(400, "Email or username is required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if( !user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid =  await user.isPasswordMatch(password)
    
    if( !isPasswordValid ){
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
      
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully" 
        )
    )
    
})


const logoutUser = asyncHandler(async(req, res) => {
    const userId = req.user._id
    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken: undefined
            }
        },
            { 
                new: true
            }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
})


const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if ( !incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized: request")
    }

   try {
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
     const user  = await User.findById(decodedToken?._id)
 
     if( !user) {
         throw new ApiError(401, "Invalid refresh token: user not found")
     }
 
     if( user?.refreshToken !== incomingRefreshToken) {
         throw new ApiError(401, "Unauthorized: refresh token mismatch")
     } 
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const { accessToken, newRefreshTokenefreshToken } = await generateAccessAndRefreshToken(user._id)
      
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new ApiResponse (
             200,
             {
                 accessToken,
                 newRefreshToken: refreshToken
             },
             "Access token refreshed successfully"
        )
     )
   } catch (error) {
         throw new ApiError(401, error?.message || "failed to refresh access token")
   }

})


export { registerUser, loginUser, logoutUser, refreshAccessToken }