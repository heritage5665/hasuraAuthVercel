import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
// import HasuraHeader from "./types/User"

declare module 'axios' {
    interface AxiosResponse<T = any> extends Promise<T> {
    }
}

abstract class HttpClient {
    protected readonly instance: AxiosInstance;

    constructor(option: AxiosRequestConfig) {

        this.instance = axios.create(option)
        this._initializeResponseInterceptor();
    }

    private _initializeResponseInterceptor = () => {
        this.instance.interceptors.response.use(
            this._handleResponse,
            this._handleError,
        )
    }

    private _handleResponse = ({ data }: AxiosResponse) => {
        let response: any = data
        if (response.errors) {
            return Promise.reject(response.errors)
        }
        return response.data
    }

    private _handleError = (error: any) => Promise.reject(error)

}



export default abstract class HasuraHttpClient extends HttpClient {

    constructor() {
        super({
            baseURL: 'https://convey-core.herokuapp.com/v1/graphql',
            headers: {
                "X-Hasura-Admin-Secret": "uAi8w7bI0h40Dmgxl2PvOooaEI1DeNoPtdYn93TjgmJKraHjT3aseuQHOy3aZGCv"
            }
        })

    }
    public runQuuery = (query: string, variables: object) => this.instance.post("", {
        "variables": variables,
        "query": query
    });
}



export class UploadHttpClient extends HttpClient {

    constructor() {
        super({
            baseURL: 'https://agile-falls-17062.herokuapp.com/upload',
            headers: {
                'Content-Type': "multipart/form-data;",
                "X-Hasura-Admin-Secret": "uAi8w7bI0h40Dmgxl2PvOooaEI1DeNoPtdYn93TjgmJKraHjT3aseuQHOy3aZGCv"
            }
        })

    }
    upload(file_type: string, file: any) {
        return this.instance.post('/' + file_type, {
            media: file
        })

    }

}
