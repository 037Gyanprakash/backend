// Custom ApiResponse class to standardize API responses across the application.
// It includes properties such as statusCode, data, message, and success to provide a constistent structure for API responses,
// message is defaulted to "success" and success is determined based on the statusCode               


class ApiResponse {
    constructor(statusCode, data, message = "success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}



export {ApiResponse}