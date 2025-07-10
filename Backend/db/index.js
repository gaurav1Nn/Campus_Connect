import mongoose from "mongoose";
import dotenv from"dotenv";

dotenv.config();
const connectdb=async()=>{
  try{
    let res= await mongoose.connect(`${process.env.MONGODB_URL}`);
    if(res) console.log("Database connected");

  }
  catch(e){
    console.error("fail to connect to db",e);
  }
}

export default connectdb;

// import mongoose from "mongoose";

// const connectdb = async () => {
//   try {
//     let res = await mongoose.connect('mongodb+srv://gauravnilawar54:8LWrgSPfs6qgj19O@cluster0.iz3viv9.mongodb.net/campus-connect?retryWrites=true&w=majority&appName=Cluster0');
//     if (res) console.log("Database connected");
//   } catch (e) {
//     console.error("fail to connect to db", e);
//   }
// }

// export default connectdb;