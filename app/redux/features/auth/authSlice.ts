import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from 'axios'
export interface AuthUser {
    id: string,
    name: string,
    email: string,
    role: "admin" | "author"
}

interface AuthState {
    user: AuthUser | null,
    isAuthenticated: boolean,
    loading:boolean,
    error:string |null;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    loading:false,
    error:null

}
interface LoginCredentials{
    email:string;
    password:string;
}

export const loginUser = createAsyncThunk<AuthUser,LoginCredentials,{rejectValue:string}>(
    'auth/loginUser',
    async(credentials ,{rejectWithValue} )=>{
        try {
            const resposne = await axios.post('/api/auth/login', credentials,{withCredentials:true})

            return resposne.data.user as AuthUser
        } catch (error) {
            if(axios.isAxiosError(error)){
                return rejectWithValue(error.response?.data?.message ?? "login failed")
            }
            return rejectWithValue("Something is wrong")
        }
    }
)
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<AuthUser>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false
        }
    },
    extraReducers:(builder)=>{
        builder
        .addCase(loginUser.pending,(state)=>{
            state.loading=true
            state.error = null
        }).addCase(loginUser.fulfilled, (state , action)=>{
            state.loading=false;
            state.user=action.payload;
            state.isAuthenticated=true;
            state.error=null

        }).addCase(loginUser.rejected ,(state , action)=>{
            state.loading=false;
            state.error = action.payload ?? "Login failed"
        })
    }
})

export const { setUser, logout } = authSlice.actions

export default authSlice.reducer