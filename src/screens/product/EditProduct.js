import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const EditProduct = ({navigation}) => {
  const [images, setImages] = useState([
    'https://picsum.photos/300?random=10',
    'https://picsum.photos/300?random=11',
    'https://picsum.photos/300?random=12',
  ]);

  const pickImage = () => {
    Alert.alert(
      "Product Image",
      "Choose an option to add/update product image",
      [
        {
          text: "Take Photo",
          onPress: () => {
            launchCamera(
              { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
              response => {
                if (!response.didCancel && response.assets) {
                  const uris = response.assets.map(a => a.uri);
                  setImages(prev => [...prev, ...uris]);
                }
              }
            );
          }
        },
        {
          text: "Choose from Gallery",
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', selectionLimit: 0, quality: 0.8 },
              response => {
                if (!response.didCancel && response.assets) {
                  const uris = response.assets.map(a => a.uri);
                  setImages(prev => [...prev, ...uris]);
                }
              }
            );
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const [productName, setProductName] = useState(
    'Organic Honey Premium',
  );

  const [brand, setBrand] = useState(
    'DeeBazar Organic',
  );

  const [category, setCategory] = useState(
    'Grocery',
  );

  const [price, setPrice] = useState('499');

  const [mrp, setMrp] = useState('699');

  const [stock, setStock] = useState('120');

  const [description, setDescription] = useState(
    '100% Pure Organic Honey collected from natural forests.',
  );

  return (

<ScrollView
style={{ flex:1,backgroundColor:"#F6F7FB", paddingTop: 15 }}
showsVerticalScrollIndicator={false}
contentContainerStyle={{paddingBottom:100}}>

{/* Header */}

<View style={styles.header}>

<TouchableOpacity
style={styles.backBtn}
onPress={()=>navigation.goBack()}>

<Ionicons
name="arrow-back"
size={22}
color="#222"
/>

</TouchableOpacity>

<Text style={styles.headerTitle}>
Edit Product
</Text>

<TouchableOpacity>

<Ionicons
name="create-outline"
size={24}
color="#2E7DFF"
/>

</TouchableOpacity>

</View>

{/* Images */}

<View style={styles.card}>

<Text style={styles.sectionTitle}>
Product Images
</Text>

<ScrollView
horizontal
showsHorizontalScrollIndicator={false}>

{images.map((item, index) => (

<View
key={index}
style={styles.imageBox}>

<Image
source={{
uri: typeof item === 'string' ? item : item?.uri
}}
style={styles.image}
/>

<TouchableOpacity
style={styles.editImageBtn}
onPress={() => removeImage(index)}>

<Ionicons
name="close"
size={18}
color="#fff"
/>

</TouchableOpacity>

</View>

))}

<TouchableOpacity
style={styles.addImageBox}
onPress={pickImage}>

<Ionicons
name="add"
size={35}
color="#2E7DFF"
/>

<Text style={styles.addImageText}>
Add
</Text>

</TouchableOpacity>

</ScrollView>

</View>

{/* Product Info */}

<View style={styles.card}>

<Text style={styles.sectionTitle}>
Basic Information
</Text>

<TextInput
value={productName}
onChangeText={setProductName}
style={styles.input}
/>

<TextInput
value={brand}
onChangeText={setBrand}
style={styles.input}
/>

<TextInput
value={category}
onChangeText={setCategory}
style={styles.input}
/>

<TextInput
value={price}
onChangeText={setPrice}
keyboardType="numeric"
style={styles.input}
/>

<TextInput
value={mrp}
onChangeText={setMrp}
keyboardType="numeric"
style={styles.input}
/>

<TextInput
value={stock}
onChangeText={setStock}
keyboardType="numeric"
style={styles.input}
/>

<TextInput
value={description}
onChangeText={setDescription}
multiline
textAlignVertical="top"
style={styles.descriptionInput}
/>

</View>
{/* Category & Brand */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Category & Brand
  </Text>

  <TouchableOpacity style={styles.selectBox}>

    <View style={styles.selectLeft}>
      <Ionicons
        name="grid-outline"
        size={22}
        color="#2E7DFF"
      />

      <Text style={styles.selectText}>
        Grocery
      </Text>
    </View>

    <Ionicons
      name="chevron-down"
      size={22}
      color="#666"
    />

  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.selectBox,{marginTop:15}]}>

    <View style={styles.selectLeft}>
      <Ionicons
        name="pricetag-outline"
        size={22}
        color="#FF9800"
      />

      <Text style={styles.selectText}>
        DeeBazar Organic
      </Text>
    </View>

    <Ionicons
      name="chevron-down"
      size={22}
      color="#666"
    />

  </TouchableOpacity>

</View>

{/* Product Variants */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Product Variants
  </Text>

  <View style={styles.variantRow}>

    {["250gm","500gm","1Kg"].map((item,index)=>(

      <TouchableOpacity
        key={index}
        style={styles.variantChip}>

        <Text style={styles.variantText}>
          {item}
        </Text>

      </TouchableOpacity>

    ))}

    <TouchableOpacity style={styles.addVariantBtn}>

      <Ionicons
        name="add"
        size={18}
        color="#2E7DFF"
      />

      <Text style={styles.addVariantText}>
        Add Variant
      </Text>

    </TouchableOpacity>

  </View>

</View>

{/* Discount */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Pricing & Discount
  </Text>

  <TextInput
    placeholder="Discount %"
    keyboardType="numeric"
    style={styles.input}
  />

  <TextInput
    placeholder="Coupon Code"
    style={styles.input}
  />

</View>

{/* Product Status */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Product Status
  </Text>

  <TouchableOpacity style={styles.statusRow}>

    <View style={styles.statusLeft}>

      <Ionicons
        name="star-outline"
        size={22}
        color="#FFC107"
      />

      <Text style={styles.statusText}>
        Featured Product
      </Text>

    </View>

    <Ionicons
      name="toggle"
      size={42}
      color="#16A34A"
    />

  </TouchableOpacity>

  <TouchableOpacity style={styles.statusRow}>

    <View style={styles.statusLeft}>

      <Ionicons
        name="flame-outline"
        size={22}
        color="#F44336"
      />

      <Text style={styles.statusText}>
        Best Seller
      </Text>

    </View>

    <Ionicons
      name="toggle-outline"
      size={42}
      color="#999"
    />

  </TouchableOpacity>

</View>

{/* Stock History */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Stock History
  </Text>

  <View style={styles.historyRow}>

    <Ionicons
      name="time-outline"
      size={18}
      color="#2E7DFF"
    />

    <Text style={styles.historyText}>
      Stock Updated • Today 11:45 AM
    </Text>

  </View>

  <View style={styles.historyRow}>

    <Ionicons
      name="cube-outline"
      size={18}
      color="#16A34A"
    />

    <Text style={styles.historyText}>
      Current Stock : 120 Units
    </Text>

  </View>

</View>

{/* Product Preview */}

<View style={styles.previewCard}>

  <Image
    source={{
      uri:"https://picsum.photos/400?random=70"
    }}
    style={styles.previewImage}
  />

  <View style={styles.previewContent}>

    <Text style={styles.previewName}>
      Organic Honey Premium
    </Text>

    <Text style={styles.previewPrice}>
      ₹499
    </Text>

    <View style={styles.liveBadge}>

      <Ionicons
        name="checkmark-circle"
        size={16}
        color="#16A34A"
      />

      <Text style={styles.liveText}>
        Live Product
      </Text>

    </View>

  </View>

</View>
{/* AI Studio */}

<TouchableOpacity
style={styles.aiCard}>

<View style={styles.aiLeft}>

<Ionicons
name="sparkles"
size={28}
color="#fff"
/>

<View style={{marginLeft:12}}>

<Text style={styles.aiTitle}>
AI Product Studio
</Text>

<Text style={styles.aiSub}>
Enhance • Remove BG • HD
</Text>

</View>

</View>

<Ionicons
name="chevron-forward"
size={22}
color="#fff"
/>

</TouchableOpacity>

{/* Buttons */}

<View style={styles.buttonRow}>

<TouchableOpacity
style={styles.deleteBtn}>

<Ionicons
name="trash-outline"
size={22}
color="#fff"
/>

<Text style={styles.btnText}>
Delete
</Text>

</TouchableOpacity>

<TouchableOpacity
style={styles.updateBtn}>

<Ionicons
name="checkmark-circle-outline"
size={22}
color="#fff"
/>

<Text style={styles.btnText}>
Update Product
</Text>

</TouchableOpacity>

</View>

</ScrollView>

  );
};

export default EditProduct;





const styles = StyleSheet.create({

  header: {
    height: 70,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    elevation: 3,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F5F6FA",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222",
  },

  card: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 15,
  },

  imageBox: {
    marginRight: 14,
    position: "relative",
  },

  image: {
    width: 110,
    height: 110,
    borderRadius: 18,
  },

  editImageBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
  },

  addImageBox: {
    width: 110,
    height: 110,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7FAFF",
  },

  addImageText: {
    marginTop: 8,
    color: "#2E7DFF",
    fontWeight: "700",
  },

  input: {
    height: 55,
    backgroundColor: "#F7F8FB",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
    color: "#222",
  },

  descriptionInput: {
    height: 130,
    backgroundColor: "#F7F8FB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
    fontSize: 15,
    color: "#222",
  },

  aiCard: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#6D28D9",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
  },

  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  aiTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
  },

  aiSub: {
    marginTop: 4,
    color: "#E9DDFF",
    fontSize: 13,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 25,
    marginBottom: 40,
  },

  deleteBtn: {
    width: "32%",
    height: 55,
    backgroundColor: "#F44336",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 3,
  },

  updateBtn: {
    width: "64%",
    height: 55,
    backgroundColor: "#2E7DFF",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 3,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
selectBox:{
  height:55,
  backgroundColor:"#F7F8FB",
  borderRadius:14,
  paddingHorizontal:15,
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
},

selectLeft:{
  flexDirection:"row",
  alignItems:"center",
},

selectText:{
  marginLeft:10,
  fontSize:15,
  color:"#444",
},

variantRow:{
  flexDirection:"row",
  flexWrap:"wrap",
},

variantChip:{
  backgroundColor:"#EEF5FF",
  paddingHorizontal:15,
  paddingVertical:10,
  borderRadius:22,
  marginRight:10,
  marginBottom:10,
},

variantText:{
  color:"#2E7DFF",
  fontWeight:"700",
},

addVariantBtn:{
  flexDirection:"row",
  alignItems:"center",
  borderWidth:1.5,
  borderColor:"#2E7DFF",
  borderRadius:22,
  paddingHorizontal:15,
  paddingVertical:10,
},

addVariantText:{
  color:"#2E7DFF",
  fontWeight:"700",
  marginLeft:5,
},

statusRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
  marginBottom:18,
},

statusLeft:{
  flexDirection:"row",
  alignItems:"center",
},

statusText:{
  marginLeft:10,
  fontSize:16,
  fontWeight:"600",
  color:"#222",
},

historyRow:{
  flexDirection:"row",
  alignItems:"center",
  marginBottom:12,
},

historyText:{
  marginLeft:10,
  color:"#666",
},

previewCard:{
  marginHorizontal:16,
  marginTop:18,
  marginBottom:20,
  backgroundColor:"#fff",
  borderRadius:20,
  overflow:"hidden",
  elevation:3,
},

previewImage:{
  width:"100%",
  height:220,
},

previewContent:{
  padding:18,
},

previewName:{
  fontSize:19,
  fontWeight:"700",
  color:"#222",
},

previewPrice:{
  marginTop:8,
  fontSize:24,
  fontWeight:"700",
  color:"#2E7DFF",
},

liveBadge:{
  marginTop:15,
  flexDirection:"row",
  alignItems:"center",
  alignSelf:"flex-start",
  backgroundColor:"#EAF8EF",
  paddingHorizontal:12,
  paddingVertical:8,
  borderRadius:20,
},

liveText:{
  color:"#16A34A",
  fontWeight:"700",
  marginLeft:6,
},
});