import HasuraHttpClient from "./client";
import User from "./types/User";

export default class UserClient extends HasuraHttpClient {
    private static classInstance?: UserClient;

    private constructor() {
        super()
    }

    public static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new UserClient()
        }
        return this.classInstance
    }

    public createRefreshToken = async (token: any) => await this.execute(`
    mutation createToken($token: refresh_tokens_insert_input!) {
      insert_refresh_tokens_one(object: $token, 
        on_conflict: {constraint: refresh_tokens_pkey, update_columns: [token, expired_at]}) {
        token
        expired_at
      }
    }
  `, { token }).then(data => data).then(({ insert_refresh_tokens_one }) => insert_refresh_tokens_one)


    public updateRefreshTokenFor = async (user_id: string, token: string) => await this.execute(`
        mutation updateRefreshTokenFor($user_id: String!, $token: String!) {
            update_refresh_tokens_by_pk(pk_columns: {user_id: $user_id}, _set: {token: $token}) {
                user_id
            }
        }`, { user_id, token }).then(data => data).then(({ update_refresh_tokens_by_pk }) => update_refresh_tokens_by_pk)

    public deleteRefreshToken = async (user_id: string) => await this.execute(`
        mutation deleteRefresh($user_id: String!) {
            delete_refresh_tokens(where: {user_id: {_eq: $user_id}}) {
                affected_rows
            }
        }
    `, { user_id })


    public getUsers = async () => await this.execute(
        `
         query GetAllUsers {
            users {
                fullname
                    email
                    phone
                    password
                    isVerified
                    passwordResetToken
                    passwordResetExpires
            }
        }
        `, {})
    
    public getRefreshTokenWith = async (token: string) => await this.execute(`
        query getRefreshTokeBy($token: String!) {
            refresh_tokens(where: {token: {_eq: $token}}) {
                created_at
                expired_at
                user {
                    user_id email phone user_type isVerified password 
                    stores{ store_id store_name  } 
                    referral:invitation_code{code} 
                }
            }
        }
        
    `, { token }).then(data => data).then(({ refresh_tokens }) => refresh_tokens[0])

    public findOne = async (key: string) => await this.execute(
        `
             query GetUserByKey($key:String!) {
                users(where:{
                    _or: [
                        { email: {_eq: $key}},
                        { user_id: {_eq: $key}},
                        { phone: {_eq: $key}}
                    ]
                },limit:1)
                {
                    user_id
                    email
                    user_type
                    isVerified
                    password
                }
            }
        `, { key }
    ).then((response) => response)
        .then(({ users }) => users[0])


    public findUserByEmail = async (email: string) => await this.execute(
        `query GetUser($email:String!,$isVerified:Boolean!) {
                users(where:{
                    _and: [
                        { email: {_eq: $email}},
                        { isVerified: {_eq: $isVerified}}
                    ]
                })
                {
                    user_id
                    email
                    phone
                    isVerified
                }
            }
        `, { "email": email, "isVerified": true }
    ).then(response => response).then(({ users }) => users[0])

    public save = async (user: User) => await this.execute(
        ` 
            mutation CreateUserOne($user_id: String!,$fullname:String!,$email:String!,
                $password:String!,$isVerified:Boolean!,$phone:String,
                $pin:String!,$expires:timestamp,$user_type:String!) {
                    insert_users_one(
                        object: {
                                user_id: $user_id,
                                user_type:$user_type,
                                fullname:$fullname,
                                email:$email,
                                password:$password,
                                isVerified:$isVerified,
                                phone:$phone,
                                one_time_pins:{
                                    data:[
                                        {
                                            pin:$pin,
                                            expires:$expires
                                        }
                                    ]
                                }
                            }
                    ){
                            user_id
                            fullname
                            email
                            phone
                            created_at
                    }
                }
        `, { ...user }
    ).then(response => {
        return response
    })
        .then(({ insert_users_one }) => {
            return insert_users_one
        })

    public findUserWithToken = async (pin: string) => {

        return await this.execute(
            `
            query FindUserWithToken($pin:String!){
                one_time_pins(where:{pin:{_eq:$pin}},limit:1,order_by:{expires:desc}){
                    expires
                    user{
                        id 
                        user_id
                        fullname
                        phone
                        password
                        email
                        isVerified
                    }
                }
            }
          `, { pin }
        ).then(response => response)
            .then(({ one_time_pins }) => {
                const { user, expires } = one_time_pins[0]
                const expires_in = (new Date(expires)).getTime()
                const now = (new Date()).getTime()
                if (expires_in > now) {
                    return user
                }
                return Promise.reject("expired token given")

            })

    }

    public getRefreshTokenForUser = async (user_id: string) => await this.execute(`
        query refreshTokenByPK($user_id: String!) {
            refresh_tokens_by_pk(user_id: $user_id) {
                created_at
                expired_at
                user {
                email
                user_id
                user_type
                phone
                }
            }
        }
    `, { user_id }).then(data => data).then(({ refresh_tokens_by_pk }) => refresh_tokens_by_pk)


    public verifyUser = async (user: any) => {
        const isVerified = true
        const { user_id } = user
        return await this.execute(
            `
            mutation VerifyUser($user_id:String!,$isVerified:Boolean!){
                update_users(where:{user_id:{_eq:$user_id}},_set:{
                    isVerified:$isVerified
                }){
                    returning{
                        user_id
                    }
                }
            
            }
            `, { isVerified, user_id }
        )
            .then(response => response)
            .then(({ update_users }) => update_users)
            .then(({ returning }) => {
                const { user_id } = returning
                if (user_id == user_id) {
                    return isVerified
                }
                return Promise.reject("error verifying user")
            })
    }

    public changePassword = async (user: any) => {
        const { password, user_id } = user
        if (!(password && user_id)) {
            return Promise.reject("user_id and password is  required")
        }
        return await this.execute(
            `
                mutation changeUserPassword($user_id:String!,$password:String!){
                    update_users(where:{user_id:{_eq:$user_id}},_set:{
                        password:$password
                    })
                    {
                        returning{
                            user_id
                        }
                    }
                 }
            `, { password, user_id }
        ).then(response => response)
            .then(({ update_users }) => update_users)
            .catch(errr => Promise.reject(errr))
    }



}

