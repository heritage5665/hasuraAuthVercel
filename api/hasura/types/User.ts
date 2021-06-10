export default interface HasuraUserModel {
    fullname: string;
    user_id: string;
    user_type: string;
    email: string;
    // referred_by: string;
    phone: string;
    password: string;
    isVerified: boolean;
    pin: string
    expires: any
}
