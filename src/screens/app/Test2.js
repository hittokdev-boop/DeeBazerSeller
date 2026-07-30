import React, { useEffect } from "react";

export default function Test2(){
    const [currentStep, setCurrentStep] = useState(0);
 
    const getprofile=()=>{
        setCurrentStep(0); // Upload
setCurrentStep(1); // Remove BG
setCurrentStep(2); // AI Enhance
setCurrentStep(3); // Studio Light
setCurrentStep(4); // HD Upscale
setCurrentStep(5); // White BG
setCurrentStep(6); // Shadow
setCurrentStep(7); // Color Fix
setCurrentStep(8); // Smart Crop
setCurrentStep(9); // Done
    }
    useEffect(()=>{
              getprofile(t)
    },[])
const aiSteps = [
  {
    icon: "cloud-upload-outline",
    title: "Uploading Image...",
    color: "#2563EB",
  },
  {
    icon: "cut-outline",
    title: "Removing Background...",
    color: "#EF4444",
  },
  {
    icon: "sparkles-outline",
    title: "AI Enhancing Product...",
    color: "#8B5CF6",
  },
  {
    icon: "sunny-outline",
    title: "Applying Studio Lighting...",
    color: "#F59E0B",
  },
  {
    icon: "scan-outline",
    title: "Upscaling to HD...",
    color: "#10B981",
  },
  {
    icon: "image-outline",
    title: "Generating White Background...",
    color: "#06B6D4",
  },
  {
    icon: "ellipse-outline",
    title: "Creating Realistic Shadow...",
    color: "#374151",
  },
  {
    icon: "color-filter-outline",
    title: "Correcting Colors...",
    color: "#EC4899",
  },
  {
    icon: "crop-outline",
    title: "Smart Cropping...",
    color: "#4F46E5",
  },
  {
    icon: "checkmark-circle",
    title: "Product Photo Ready!",
    color: "#16A34A",
  },
];
    return(
        <>
        {/* AI Tools */}

<View style={styles.toolsCard}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>AI Editing Tools</Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>See All</Text>
    </TouchableOpacity>
  </View>

  <View style={styles.toolsGrid}>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#E8F1FF"}]}>
        <Ionicons
          name="cut-outline"
          size={28}
          color="#2563EB"
        />
      </View>
      <Text style={styles.toolText}>Remove BG</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#F3E8FF"}]}>
        <Ionicons
          name="sparkles-outline"
          size={28}
          color="#7C3AED"
        />
      </View>
      <Text style={styles.toolText}>AI Enhance</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#FFF4E5"}]}>
        <Ionicons
          name="sunny-outline"
          size={28}
          color="#F59E0B"
        />
      </View>
      <Text style={styles.toolText}>Studio Light</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#EAFBF2"}]}>
        <Ionicons
          name="scan-outline"
          size={28}
          color="#16A34A"
        />
      </View>
      <Text style={styles.toolText}>HD Upscale</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#ECFEFF"}]}>
        <Ionicons
          name="image-outline"
          size={28}
          color="#0891B2"
        />
      </View>
      <Text style={styles.toolText}>White BG</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#F3F4F6"}]}>
        <Ionicons
          name="ellipse-outline"
          size={28}
          color="#374151"
        />
      </View>
      <Text style={styles.toolText}>Auto Shadow</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#FFF1F2"}]}>
        <Ionicons
          name="color-filter-outline"
          size={28}
          color="#E11D48"
        />
      </View>
      <Text style={styles.toolText}>Color Fix</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#EEF2FF"}]}>
        <Ionicons
          name="crop-outline"
          size={28}
          color="#4F46E5"
        />
      </View>
      <Text style={styles.toolText}>Smart Crop</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#FEF9C3"}]}>
        <Ionicons
          name="contrast-outline"
          size={28}
          color="#CA8A04"
        />
      </View>
      <Text style={styles.toolText}>Auto HDR</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#FCE7F3"}]}>
        <Ionicons
          name="brush-outline"
          size={28}
          color="#DB2777"
        />
      </View>
      <Text style={styles.toolText}>Magic Eraser</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#ECFDF5"}]}>
        <Ionicons
          name="resize-outline"
          size={28}
          color="#059669"
        />
      </View>
      <Text style={styles.toolText}>Resize AI</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toolItem}>
      <View style={[styles.toolIcon,{backgroundColor:"#F5F3FF"}]}>
        <Ionicons
          name="flash-outline"
          size={28}
          color="#8B5CF6"
        />
      </View>
      <Text style={styles.toolText}>Auto Relight</Text>
    </TouchableOpacity>

  </View>

</View>
{/* AI Processing Card */}

<View style={styles.processingCard}>

    <View style={styles.processingHeader}>

        <View>
            <Text style={styles.processingTitle}>
                AI Processing
            </Text>

            <Text style={styles.processingSub}>
                Optimizing your product photo
            </Text>
        </View>

        <View style={styles.percentBadge}>
            <Text style={styles.percentText}>
                72%
            </Text>
        </View>

    </View>

    {/* Progress */}

    <View style={styles.progressBar}>
        <View
            style={[
                styles.progressFill,
                {
                    width: "72%",
                },
            ]}
        />
    </View>

    {/* Current Step */}

    <View style={styles.currentStepCard}>

        <Ionicons
            name="sparkles"
            color="#7C3AED"
            size={22}
        />

        <View style={{marginLeft:12,flex:1}}>

            <Text style={styles.stepTitle}>
                Current Step
            </Text>

            <Text style={styles.stepValue}>
                AI Enhancing Product
            </Text>

        </View>

    </View>

    {/* Info Row */}

    <View style={styles.infoRow}>

        <View style={styles.infoBox}>
            <Ionicons
                name="time-outline"
                color="#2563EB"
                size={22}
            />

            <Text style={styles.infoLabel}>
                Estimated
            </Text>

            <Text style={styles.infoValue}>
                18 sec
            </Text>
        </View>

        <View style={styles.infoBox}>
            <Ionicons
                name="layers-outline"
                color="#10B981"
                size={22}
            />

            <Text style={styles.infoLabel}>
                Completed
            </Text>

            <Text style={styles.infoValue}>
                5 / 8
            </Text>
        </View>

        <View style={styles.infoBox}>
            <Ionicons
                name="flash-outline"
                color="#F59E0B"
                size={22}
            />

            <Text style={styles.infoLabel}>
                Quality
            </Text>

            <Text style={styles.infoValue}>
                HD
            </Text>
        </View>

    </View>
<View style={styles.statusContainer}>

    <View
        style={[
            styles.statusIcon,
            {
                backgroundColor:
                    aiSteps[currentStep].color + "20",
            },
        ]}>

        <Ionicons
            name={aiSteps[currentStep].icon}
            size={26}
            color={aiSteps[currentStep].color}
        />

    </View>

    <View style={{flex:1,marginLeft:14}}>

        <Text style={styles.statusLabel}>
            Current Status
        </Text>

        <Text style={styles.statusValue}>
            {aiSteps[currentStep].title}
        </Text>

    </View>
<View style={styles.statusContainer}>

    <View
        style={[
            styles.statusIcon,
            {
                backgroundColor:
                    aiSteps[currentStep].color + "20",
            },
        ]}>

        <Ionicons
            name={aiSteps[currentStep].icon}
            size={26}
            color={aiSteps[currentStep].color}
        />

    </View>

    <View style={{flex:1,marginLeft:14}}>

        <Text style={styles.statusLabel}>
            Current Status
        </Text>

        <Text style={styles.statusValue}>
            {aiSteps[currentStep].title}
        </Text>

    </View>

</View>
</View>
</View>
        </>
    )
}
const Styles=StyleSheet.create({
statusContainer:{
    marginTop:20,
    backgroundColor:"#F8FAFC",
    borderRadius:18,
    padding:16,
    flexDirection:"row",
    alignItems:"center",
},

statusIcon:{
    width:56,
    height:56,
    borderRadius:16,
    justifyContent:"center",
    alignItems:"center",
},

statusLabel:{
    fontSize:13,
    color:"#6B7280",
},

statusValue:{
    marginTop:4,
    fontSize:16,
    fontWeight:"700",
    color:"#111827",
},
    statusContainer:{
    marginTop:20,
    backgroundColor:"#F8FAFC",
    borderRadius:18,
    padding:16,
    flexDirection:"row",
    alignItems:"center",
},

statusIcon:{
    width:56,
    height:56,
    borderRadius:16,
    justifyContent:"center",
    alignItems:"center",
},

statusLabel:{
    fontSize:13,
    color:"#6B7280",
},

statusValue:{
    marginTop:4,
    fontSize:16,
    fontWeight:"700",
    color:"#111827",
},
    toolsCard:{
    marginHorizontal:16,
    marginTop:20,
    backgroundColor:"#fff",
    borderRadius:22,
    padding:18,
    elevation:4,
},

sectionHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:18,
},

sectionTitle:{
    fontSize:18,
    fontWeight:"700",
    color:"#111827",
},

seeAll:{
    color:"#2563EB",
    fontWeight:"700",
},

toolsGrid:{
    flexDirection:"row",
    flexWrap:"wrap",
    justifyContent:"space-between",
},

toolItem:{
    width:"23%",
    alignItems:"center",
    marginBottom:20,
},

toolIcon:{
    width:64,
    height:64,
    borderRadius:20,
    justifyContent:"center",
    alignItems:"center",
    marginBottom:8,
},

toolText:{
    fontSize:12,
    fontWeight:"600",
    color:"#374151",
    textAlign:"center",
},
processingCard:{
    backgroundColor:"#fff",
    marginHorizontal:16,
    marginTop:20,
    borderRadius:22,
    padding:18,
    elevation:4,
},

processingHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
},

processingTitle:{
    fontSize:18,
    fontWeight:"700",
    color:"#111827",
},

processingSub:{
    color:"#6B7280",
    marginTop:4,
},

percentBadge:{
    backgroundColor:"#EEF2FF",
    paddingHorizontal:14,
    paddingVertical:8,
    borderRadius:25,
},

percentText:{
    color:"#2563EB",
    fontWeight:"700",
},

progressBar:{
    marginTop:18,
    height:10,
    backgroundColor:"#E5E7EB",
    borderRadius:10,
    overflow:"hidden",
},

progressFill:{
    height:"100%",
    backgroundColor:"#2563EB",
    borderRadius:10,
},

currentStepCard:{
    marginTop:20,
    backgroundColor:"#F8FAFC",
    borderRadius:16,
    padding:14,
    flexDirection:"row",
    alignItems:"center",
},

stepTitle:{
    color:"#6B7280",
    fontSize:12,
},

stepValue:{
    fontWeight:"700",
    fontSize:15,
    color:"#111827",
    marginTop:2,
},

infoRow:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginTop:20,
},

infoBox:{
    width:"31%",
    backgroundColor:"#F9FAFB",
    borderRadius:16,
    alignItems:"center",
    paddingVertical:15,
},

infoLabel:{
    marginTop:8,
    fontSize:12,
    color:"#6B7280",
},

infoValue:{
    marginTop:4,
    fontWeight:"700",
    fontSize:16,
    color:"#111827",
},
})