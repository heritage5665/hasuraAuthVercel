import HttpClient from "./client";

interface HasuraTokenModel {
    user_id: string
    pin: string
    expires: any
}

export default class TokenClient extends HttpClient {
    private static classInstance?: TokenClient;

    private constructor() {
        super()
    }

    public static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new TokenClient()
        }
        return this.classInstance
    }

    public save = async (token: HasuraTokenModel) => await this.runQuuery(
        ` 
        mutation CreateUserOne($user_id: String!,$pin:String!,$expires:timestamp) {
            delete_one_time_pins(where:{user_id:$user_id}){
                returning{
                    affected_rows
                }
            }
            insert_one_time_pins_one( object: {user_id:$user_id,pin:$pin,
                expires:$expires}
            ) { 
                id
                user_id
                pin
                created_at
            }
        }
        `, { ...token }
    ).then(response => response).then(({ insert_one_time_pins }) => insert_one_time_pins)




}