#!/usr/bin/env python3
"""
Example script demonstrating MCP Knowledge Graph integration
Shows how to initialize patients, add sessions, and query memory
"""

import sys
import os
import json


# Add the parent directory to the path so we can import our services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.mcp_knowledge_graph_client import mcp_client
from services.mcp_integration import mcp_provider

def example_patient_data():
    """Create example patient data"""
    return {
        "name": "Sarah Johnson",
        "age": 28,
        "gender": "female",
        "trauma_type": "motor_vehicle_accident",
        "baseline_sud": 8,
        "pcl5": [3, 4, 3, 2, 4, 3, 3, 2, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 2, 3],  # PCL-5 scores
        "phq9": [2, 3, 2, 1, 3, 2, 2, 1, 2],  # PHQ-9 scores
        "ptsd_symptoms": [
            "intrusive memories",
            "nightmares",
            "avoidance of driving",
            "hypervigilance",
            "sleep disturbance"
        ],
        "triggers": [
            {"name": "car horns", "sud": 9},
            {"name": "screeching brakes", "sud": 8},
            {"name": "intersection crossings", "sud": 7},
            {"name": "highway driving", "sud": 6}
        ]
    }

def example_session_data():
    """Create example session data"""
    return [
        {
            "type": "exposure_therapy",
            "initial_sud": 8,
            "final_sud": 5,
            "duration": 45,
            "notes": "Patient showed good engagement with imaginal exposure to accident scene"
        },
        {
            "type": "exposure_therapy", 
            "initial_sud": 6,
            "final_sud": 3,
            "duration": 50,
            "notes": "Significant progress with in-vivo exposure to driving simulation"
        },
        {
            "type": "exposure_therapy",
            "initial_sud": 5,
            "final_sud": 2,
            "duration": 40,
            "notes": "Patient successfully completed highway driving exposure with minimal distress"
        }
    ]

def demonstrate_mcp_integration():
    """Demonstrate the MCP Knowledge Graph integration"""
    print("🚀 MCP Knowledge Graph Integration Demo")
    print("=" * 50)
    
    # 1. Initialize patient in MCP Knowledge Graph
    print("\n1. Initializing patient in MCP Knowledge Graph...")
    patient_id = "demo_patient_001"
    patient_data = example_patient_data()
    
    try:
        # Initialize patient memory
        mcp_provider.initialize_patient_memory(patient_id, patient_data)
        print(f"✅ Patient {patient_data['name']} initialized successfully")
        
        # Get initial patient context
        context = mcp_provider.get_patient_context(patient_id)
        print(f"✅ Patient context retrieved - {len(context.mcp_memory.get('patient_entities', []))} entities created")
        
    except Exception as e:
        print(f"❌ Failed to initialize patient: {e}")
        return
    
    # 2. Add session memories
    print("\n2. Adding therapy session memories...")
    sessions = example_session_data()
    
    for i, session_data in enumerate(sessions, 1):
        try:
            mcp_provider.update_session_memory(patient_id, session_data)
            print(f"✅ Session {i} added successfully (SUD: {session_data['initial_sud']} → {session_data['final_sud']})")
        except Exception as e:
            print(f"❌ Failed to add session {i}: {e}")
    
    # 3. Retrieve comprehensive patient context
    print("\n3. Retrieving comprehensive patient context...")
    try:
        context = mcp_provider.get_patient_context(patient_id, "therapy_review")
        
        print(f"✅ Context retrieved:")
        print(f"   - Total sessions: {context.metadata.get('total_sessions', 0)}")
        print(f"   - Progress trend: {context.metadata.get('progress_trend', 'unknown')}")
        print(f"   - MCP entities: {context.metadata.get('mcp_entities_count', 0)}")
        print(f"   - MCP relationships: {context.metadata.get('mcp_relations_count', 0)}")
        
    except Exception as e:
        print(f"❌ Failed to retrieve context: {e}")
    
    # 4. Get session memory
    print("\n4. Retrieving session memory...")
    try:
        session_memory = mcp_provider.get_session_memory(patient_id, session_count=3)
        
        print(f"✅ Session memory retrieved:")
        print(f"   - Recent sessions: {len(session_memory.get('recent_sessions', []))}")
        print(f"   - MCP sessions: {len(session_memory.get('mcp_sessions', []))}")
        print(f"   - Continuity notes: {len(session_memory.get('continuity_notes', []))}")
        
        if session_memory.get('continuity_notes'):
            print(f"   - Latest note: {session_memory['continuity_notes'][0]}")
        
    except Exception as e:
        print(f"❌ Failed to retrieve session memory: {e}")
    
    # 5. Search memory
    print("\n5. Searching memory...")
    search_queries = ["driving", "nightmares", "SUD reduction"]
    
    for query in search_queries:
        try:
            results = mcp_provider.search_memory(query)
            print(f"✅ Search '{query}': {results.get('total_results', 0)} results")
            
            if results.get('mcp_results'):
                print(f"   - MCP results: {len(results['mcp_results'])}")
            if results.get('nx_results'):
                print(f"   - NetworkX results: {len(results['nx_results'])}")
                
        except Exception as e:
            print(f"❌ Search '{query}' failed: {e}")
    
    # 6. Get story generation context
    print("\n6. Getting enhanced story generation context...")
    try:
        story_context = mcp_provider.enhance_story_generation_context(patient_id, exposure_stage=2)
        
        print(f"✅ Story context generated:")
        print(f"   - Patient age: {story_context['patient_profile']['demographics']['age']}")
        print(f"   - Primary triggers: {len(story_context['triggers_and_symptoms']['primary_triggers'])}")
        print(f"   - Key symptoms: {len(story_context['triggers_and_symptoms']['key_symptoms'])}")
        print(f"   - MCP insights: {len(story_context['mcp_insights']['session_history'])} session records")
        print(f"   - Personalization hints: {len(story_context['personalization_hints'])}")
        print(f"   - Safety considerations: {len(story_context['safety_considerations'])}")
        
    except Exception as e:
        print(f"❌ Failed to get story context: {e}")
    
    # 7. Find similar patients (will be empty in this demo)
    print("\n7. Finding similar patients...")
    try:
        similar_patients = mcp_client.get_similar_patients(patient_id, similarity_threshold=0.5)
        print(f"✅ Found {len(similar_patients)} similar patients")
        
        if similar_patients:
            for patient in similar_patients[:2]:  # Show top 2
                print(f"   - Patient {patient['patient_id']}: {patient['similarity_score']:.2f} similarity")
        else:
            print("   - No similar patients found (expected in demo with single patient)")
            
    except Exception as e:
        print(f"❌ Failed to find similar patients: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 MCP Knowledge Graph Demo completed!")
    print("\nKey features demonstrated:")
    print("✅ Patient initialization in dual knowledge graphs")
    print("✅ Session memory tracking and persistence")
    print("✅ Cross-graph search capabilities")
    print("✅ Enhanced context for story generation")
    print("✅ Memory-based insights and recommendations")
    
    print(f"\nMemory files created in: data/mcp_memory/")
    print("You can now:")
    print("- Start the Flask app and visit /dashboard/mcp-memory")
    print("- Use the API endpoints to interact with the memory")
    print("- Integrate with your existing therapy workflows")

def show_memory_file_contents():
    """Show the contents of the MCP memory file"""
    print("\n📄 MCP Memory File Contents:")
    print("-" * 30)
    
    memory_file = "data/mcp_memory.jsonl"
    if os.path.exists(memory_file):
        try:
            with open(memory_file, 'r') as f:
                lines = f.readlines()
                if lines:
                    # Show the last (most recent) state
                    last_state = json.loads(lines[-1])
                    print(f"Entities: {len(last_state.get('entities', {}))}")
                    print(f"Relations: {len(last_state.get('relations', []))}")
                    
                    # Show some entity examples
                    entities = last_state.get('entities', {})
                    for i, (entity_id, entity) in enumerate(entities.items()):
                        if i >= 3:  # Show only first 3
                            break
                        print(f"\nEntity: {entity_id}")
                        print(f"  Type: {entity.get('entityType', 'unknown')}")
                        print(f"  Observations: {len(entity.get('observations', []))}")
                else:
                    print("Memory file is empty")
        except Exception as e:
            print(f"Error reading memory file: {e}")
    else:
        print("Memory file not found")

if __name__ == "__main__":
    try:
        demonstrate_mcp_integration()
        show_memory_file_contents()
    except KeyboardInterrupt:
        print("\n\n⏹️  Demo interrupted by user")
    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        import traceback
        traceback.print_exc() 