import { MongoClient } from "mongodb";

const db_uri = "mongodb://localhost:27017";

const connect = () => {
    const client = new MongoClient(db_uri);
    const db = client.db("dishOrderSystem");

    return { client, db };
};

async function run(){
    const { client, db } = connect();
    try{
        //query1
        const orderColl = db.collection("order");
        const aggre1 = [
            {
              $unwind: "$dishes"
            },
            {
              $group:{
                _id: "$customer.customer_id",
                customer_name: { $first: "$customer.customer_name" },
                total_cost: {
                    $sum: {
                    $multiply: ["$dishes.quantity", "$dishes.price"]
                  }
                }
              }
            },
            {
              $sort: {
                total_cost: -1 //order by followers count desc
              }
            },
            {
              $limit: 10
            },
            {
              $project: {
                customer: "$customer_name",
                total_cost: { $round: ["$total_cost", 2] } // Round to 2 decimal places
              }
            },
          ]


        const orders = await orderColl.aggregate(aggre1).toArray();
        console.log("query 1: use the aggregation framework")
        console.log("the top 10 customer by their total cost")
        for await (const order of orders) {
            console.log(`${order.customer}, total cost: ${order.total_cost}`);
        }

        console.log("  ")
        console.log("  ")

        //query2
        const dishColl = db.collection("dish");
        const query2 = {"$or": [{"price": {"$gte": 20, "$lte": 25}}, {"restaurant.restaurant_address": {"$regex": "road", "$options": "i"}}]};
        const dishes = await dishColl.find(query2).toArray();
        console.log("query 2: contain a complex search criterion")
        console.log("the dishes with a price between 20 and 25 and where the restaurant address contains 'road'")
        for await (const dish of dishes) {
            console.log(`${dish.dish_name}, price: ${dish.price}, restaurant address: ${dish.restaurant.restaurant_address}`);
        }

        console.log("  ")
        console.log("  ")
        
        //query3
        const query3 = {"price": {"$lte": 15}};
        const count = await dishColl.countDocuments(query3);
        console.log("query 3: counting documents for an specific user")
        console.log("counting the number of dishes with a price less than 15 across all menu")
        console.log(`${count} dishes`);

        console.log("  ")
        console.log("  ")
        
        //query4
        console.log("query 4: updating a document based on a query parameter ")
        console.log("update orders status")
        const pendingQ = {"order_status": "Pending"};
        const pendingCount = await orderColl.countDocuments(pendingQ)     
        console.log(`number of pending orders: ${pendingCount}`)   
        console.log("update the statau of orders from 'Pending' to 'Delivery'")
        await orderColl.updateMany(pendingQ, 
            {$set:{"order_status":"Delivery"}})
        const pendingCount1 = await orderColl.countDocuments(pendingQ)
        console.log(`number of pending orders: ${pendingCount1}`) 
        console.log("  ")
        console.log("  ")


        //query5
        
        console.log("query 5: updating a document based on a query parameter")
        console.log("correct the delivery address of orders that are not done for Sheree Oke")
        await orderColl.updateMany(
            {
                $and: [{"customer.customer_name": "Sheree Oke"}, {"order_status": {$ne: 'Done'}}]
            },
            {
                $set: {"customer.delivery_address": "4990 Del Mar Pass"}
            }
        )
        const orders5 = await orderColl.find({"customer.customer_name": "Sheree Oke"}).toArray()
        for await (const order of orders5) {
            console.log(`customer name: ${order.customer.customer_name}, status: ${order.order_status}, delivery address: ${order.customer.delivery_address}`);
        }

    } catch (err) {
        console.log(err);
    } finally {
        await client.close();
    }
}

run();