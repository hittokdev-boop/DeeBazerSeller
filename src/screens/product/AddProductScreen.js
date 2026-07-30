import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const AddProduct = ({navigation, route}) => {
  const [images, setImages] = useState([
    'https://picsum.photos/300?1',
    'https://picsum.photos/300?2',
  ]);

  useEffect(() => {
    if (route?.params?.newImage) {
      setImages(prev => [route.params.newImage, ...prev]);
    }
  }, [route?.params?.newImage]);

  const handlePickImage = () => {
    Alert.alert(
      "Product Image Upload",
      "Choose an option to upload product image",
      [
        {
          text: "Take Photo",
          onPress: () => {
            launchCamera(
              {
                mediaType: 'photo',
                quality: 0.8,
                saveToPhotos: false,
              },
              response => {
                if (response.didCancel) return;
                if (response.errorMessage) {
                  Alert.alert("Error", response.errorMessage);
                  return;
                }
                if (response.assets && response.assets.length > 0) {
                  const newUris = response.assets.map(asset => asset.uri);
                  setImages(prev => [...prev, ...newUris]);
                }
              }
            );
          },
        },
        {
          text: "Choose from Gallery",
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                selectionLimit: 0,
                quality: 0.8,
              },
              response => {
                if (response.didCancel) return;
                if (response.errorMessage) {
                  Alert.alert("Error", response.errorMessage);
                  return;
                }
                if (response.assets && response.assets.length > 0) {
                  const newUris = response.assets.map(asset => asset.uri);
                  setImages(prev => [...prev, ...newUris]);
                }
              }
            );
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleRemoveImage = indexToRemove => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F6F7FB', paddingTop: 15 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingBottom: 100}}>

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>

          <Ionicons
            name="arrow-back"
            size={22}
            color="#222"
          />

        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Add Product
        </Text>

        <TouchableOpacity style={styles.draftButton}>
          <Text style={styles.draftText}>
            Draft
          </Text>
        </TouchableOpacity>

      </View>

      {/* Upload Images */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Product Images
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}>

          <TouchableOpacity
            style={styles.uploadBox}
            onPress={handlePickImage}>

            <Ionicons
              name="camera-outline"
              size={34}
              color="#2E7DFF"
            />

            <Text style={styles.uploadText}>
              Upload
            </Text>

          </TouchableOpacity>

          {images.map((item, index) => (

            <View
              key={index}
              style={styles.imageContainer}>

              <Image
                source={{uri: typeof item === 'string' ? item : item?.uri}}
                style={styles.image}
              />

              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => handleRemoveImage(index)}>

                <Ionicons
                  name="close"
                  color="#fff"
                  size={16}
                />

              </TouchableOpacity>

            </View>

          ))}

        </ScrollView>

      </View>

      {/* AI Studio */}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AIProductStudio')}
        style={styles.aiCard}>

        <View style={styles.aiLeft}>

          <View style={styles.aiIcon}>

            <Ionicons
              name="sparkles"
              size={28}
              color="#fff"
            />

          </View>

          <View style={{flex:1,marginLeft:12}}>

            <Text style={styles.aiTitle}>
              AI Product Studio
            </Text>

            <Text style={styles.aiSub}>
              Remove Background • HD • Studio Light
            </Text>

          </View>

        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#fff"
        />

      </TouchableOpacity>

      {/* Product Info */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Basic Information
        </Text>

        <TextInput
          placeholder="Product Name"
          style={styles.input}
        />

        <TextInput
          placeholder="Brand"
          style={styles.input}
        />

        <TextInput
          placeholder="SKU"
          style={styles.input}
        />

        <TextInput
          placeholder="Category"
          style={styles.input}
        />

      </View>

      {/* Pricing */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Pricing
        </Text>

        <TextInput
          placeholder="Selling Price"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="MRP"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Discount (%)"
          keyboardType="numeric"
          style={styles.input}
        />

      </View>

      {/* Inventory */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Inventory
        </Text>

        <TextInput
          placeholder="Stock Quantity"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Minimum Stock Alert"
          keyboardType="numeric"
          style={styles.input}
        />

      </View>

      {/* Description */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Description
        </Text>

        <TextInput
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          placeholder="Write product description..."
          style={styles.descriptionInput}
        />

      </View>
            {/* Category */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Product Category
        </Text>

        <TouchableOpacity style={styles.selectBox}>

          <View style={styles.selectLeft}>
            <Ionicons
              name="grid-outline"
              size={22}
              color="#2E7DFF"
            />

            <Text style={styles.selectText}>
              Select Category
            </Text>
          </View>

          <Ionicons
            name="chevron-down"
            size={22}
            color="#777"
          />

        </TouchableOpacity>

      </View>

      {/* Brand */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Brand
        </Text>

        <TouchableOpacity style={styles.selectBox}>

          <View style={styles.selectLeft}>
            <Ionicons
              name="pricetag-outline"
              size={22}
              color="#FF9800"
            />

            <Text style={styles.selectText}>
              Select Brand
            </Text>
          </View>

          <Ionicons
            name="chevron-down"
            size={22}
            color="#777"
          />

        </TouchableOpacity>

      </View>

      {/* Variants */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Product Variants
        </Text>

        <View style={styles.variantRow}>

          <TouchableOpacity style={styles.variantChip}>
            <Text style={styles.variantText}>
              Size
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.variantChip}>
            <Text style={styles.variantText}>
              Color
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.variantChip}>
            <Text style={styles.variantText}>
              Weight
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addChip}>
            <Ionicons
              name="add"
              size={18}
              color="#2E7DFF"
            />

            <Text style={styles.addChipText}>
              Add
            </Text>
          </TouchableOpacity>

        </View>

      </View>

      {/* Shipping */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Shipping Details
        </Text>

        <TextInput
          placeholder="Weight (Kg)"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Length"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Width"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Height"
          keyboardType="numeric"
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

            <Text style={styles.statusTitle}>
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
              color="#FF5722"
            />

            <Text style={styles.statusTitle}>
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

      {/* SEO */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          SEO & Search Tags
        </Text>

        <TextInput
          placeholder="Keywords (comma separated)"
          style={styles.input}
        />

        <TextInput
          placeholder="Meta Description"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.descriptionInput}
        />

      </View>
      {/* AI Description */}

      <View style={styles.card}>

        <View style={styles.cardHeader}>

          <Text style={styles.sectionTitle}>
            AI Content Generator
          </Text>

          <TouchableOpacity style={styles.aiGenerateBtn}>

            <Ionicons
              name="sparkles"
              size={18}
              color="#fff"
            />

            <Text style={styles.aiGenerateText}>
              Generate
            </Text>

          </TouchableOpacity>

        </View>

        <Text style={styles.helperText}>
          Let AI generate a professional product title and description.
        </Text>

      </View>

      {/* Supplier */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Supplier Details
        </Text>

        <TextInput
          placeholder="Supplier Name"
          style={styles.input}
        />

        <TextInput
          placeholder="Supplier Contact"
          keyboardType="phone-pad"
          style={styles.input}
        />

      </View>

      {/* Tax */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Tax Information
        </Text>

        <TextInput
          placeholder="GST %"
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="HSN Code"
          style={styles.input}
        />

      </View>

      {/* Offer */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Offer & Coupon
        </Text>

        <TextInput
          placeholder="Offer Title"
          style={styles.input}
        />

        <TextInput
          placeholder="Coupon Code"
          style={styles.input}
        />

        <TextInput
          placeholder="Offer Percentage"
          keyboardType="numeric"
          style={styles.input}
        />

      </View>

      {/* Preview */}

      <View style={styles.previewCard}>

        <Image
          source={{
            uri: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.uri) : "https://picsum.photos/300?random=44"
          }}
          style={styles.previewImage}
        />

        <View style={styles.previewInfo}>

          <Text style={styles.previewTitle}>
            Organic Honey Premium
          </Text>

          <Text style={styles.previewPrice}>
            ₹499
          </Text>

          <View style={styles.previewBadge}>

            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#16A34A"
            />

            <Text style={styles.previewBadgeText}>
              Ready to Publish
            </Text>

          </View>

        </View>

      </View>
      {/* Buttons */}

      <View style={styles.buttonRow}>

        <TouchableOpacity style={styles.saveDraftBtn}>

          <Ionicons
            name="document-text-outline"
            color="#2E7DFF"
            size={20}
          />

          <Text style={styles.saveDraftText}>
            Save Draft
          </Text>

        </TouchableOpacity>

        <TouchableOpacity style={styles.publishBtn}>

          <Ionicons
            name="cloud-upload-outline"
            color="#fff"
            size={20}
          />

          <Text style={styles.publishText}>
            Publish Product
          </Text>

        </TouchableOpacity>

      </View>

    </ScrollView>
  );
};

export default AddProduct;


const styles = StyleSheet.create({

  header: {
    height: 70,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    elevation: 2,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222",
  },

  draftButton: {
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  draftText: {
    color: "#2E7DFF",
    fontWeight: "700",
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

  uploadBox: {
    width: 110,
    height: 110,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "#F8FBFF",
  },

  uploadText: {
    marginTop: 8,
    color: "#2E7DFF",
    fontWeight: "700",
  },

  imageContainer: {
    marginRight: 12,
    position: "relative",
  },

  image: {
    width: 110,
    height: 110,
    borderRadius: 18,
  },

  removeImage: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
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
    flex: 1,
  },

  aiIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  aiTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  aiSub: {
    color: "#E5DDFF",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },

  input: {
    height: 55,
    backgroundColor: "#F6F7FB",
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  descriptionInput: {
    height: 140,
    backgroundColor: "#F6F7FB",
    borderRadius: 14,
    padding: 15,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
  },

  saveDraftBtn: {
    width: "32%",
    height: 55,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
  },

  saveDraftText: {
    color: "#2E7DFF",
    fontWeight: "700",
    marginLeft: 6,
  },

  publishBtn: {
    width: "64%",
    height: 55,
    borderRadius: 15,
    backgroundColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 4,
  },

  publishText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },
selectBox:{
  height:55,
  backgroundColor:"#F6F7FB",
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
  color:"#666",
},

variantRow:{
  flexDirection:"row",
  flexWrap:"wrap",
},

variantChip:{
  backgroundColor:"#EEF5FF",
  paddingHorizontal:16,
  paddingVertical:10,
  borderRadius:25,
  marginRight:10,
  marginBottom:10,
},

variantText:{
  color:"#2E7DFF",
  fontWeight:"600",
},

addChip:{
  flexDirection:"row",
  alignItems:"center",
  borderWidth:1.5,
  borderColor:"#2E7DFF",
  paddingHorizontal:16,
  paddingVertical:10,
  borderRadius:25,
},

addChipText:{
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

statusTitle:{
  marginLeft:10,
  fontSize:16,
  color:"#222",
  fontWeight:"600",
},
  cardHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
  },

  helperText:{
    color:"#777",
    fontSize:14,
    lineHeight:22,
  },

  aiGenerateBtn:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#7C3AED",
    paddingHorizontal:14,
    paddingVertical:8,
    borderRadius:20,
  },

  aiGenerateText:{
    color:"#fff",
    fontWeight:"700",
    marginLeft:6,
  },

  previewCard:{
    marginHorizontal:16,
    marginTop:20,
    marginBottom:20,
    backgroundColor:"#fff",
    borderRadius:20,
    overflow:"hidden",
    elevation:4,
  },

  previewImage:{
    width:"100%",
    height:220,
  },

  previewInfo:{
    padding:18,
  },

  previewTitle:{
    fontSize:20,
    fontWeight:"700",
    color:"#222",
  },

  previewPrice:{
    marginTop:8,
    fontSize:24,
    color:"#2E7DFF",
    fontWeight:"700",
  },

  previewBadge:{
    marginTop:15,
    alignSelf:"flex-start",
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#EAF8EF",
    paddingHorizontal:12,
    paddingVertical:8,
    borderRadius:20,
  },

  previewBadgeText:{
    color:"#16A34A",
    fontWeight:"700",
    marginLeft:6,
  },
});