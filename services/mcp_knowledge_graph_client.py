"""
MCP Knowledge Graph Client
Integrates with the mcp-knowledge-graph tool for persistent AI memory
"""

import json
import logging
import asyncio
import subprocess
import os
import tempfile
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class MCPEntity:
    """Entity for MCP Knowledge Graph"""
    name: str
    entityType: str
    observations: List[str]

@dataclass
class MCPRelation:
    """Relation for MCP Knowledge Graph"""
    from_entity: str  # 'from' is a Python keyword
    to: str
    relationType: str

class MCPKnowledgeGraphClient:
    """
    Client for interacting with the MCP Knowledge Graph server
    Provides persistent memory for PTSD therapy sessions
    """
    
    def __init__(self, memory_path: str = None):
        self.memory_path = memory_path or os.path.join(os.getcwd(), "data", "mcp_memory.jsonl")
        self.server_process = None
        self.server_port = 3000
        self.is_running = False
        
        # Ensure memory directory exists
        os.makedirs(os.path.dirname(self.memory_path), exist_ok=True)
        
    async def start_server(self):
        """Start the MCP Knowledge Graph server"""
        try:
            # Check if npx is available
            subprocess.run(["npx", "--version"], check=True, capture_output=True)
            
            # Start the MCP server
            cmd = [
                "npx", "-y", "mcp-knowledge-graph",
                "--memory-path", self.memory_path
            ]
            
            self.server_process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Wait a moment for server to start
            await asyncio.sleep(2)
            
            self.is_running = True
            logger.info(f"MCP Knowledge Graph server started with memory path: {self.memory_path}")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to start MCP server: {e}")
            raise
        except FileNotFoundError:
            logger.error("npx not found. Please install Node.js and npm")
            raise
    
    async def stop_server(self):
        """Stop the MCP Knowledge Graph server"""
        if self.server_process:
            self.server_process.terminate()
            await self.server_process.wait()
            self.is_running = False
            logger.info("MCP Knowledge Graph server stopped")
    
    def _call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call an MCP tool via the command line interface
        This is a simplified approach - in production you'd use the MCP protocol directly
        """
        try:
            # For now, we'll simulate MCP calls by directly manipulating the memory file
            # In a full implementation, you'd use the MCP protocol
            return self._simulate_mcp_call(tool_name, arguments)
        except Exception as e:
            logger.error(f"MCP tool call failed: {e}")
            return {"error": str(e)}
    
    def _simulate_mcp_call(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate MCP calls by reading/writing to the memory file
        This is a simplified implementation for demonstration
        """
        memory_data = self._load_memory()
        
        if tool_name == "create_entities":
            entities = arguments.get("entities", [])
            for entity in entities:
                entity_id = entity["name"]
                if entity_id not in memory_data.get("entities", {}):
                    memory_data.setdefault("entities", {})[entity_id] = entity
            self._save_memory(memory_data)
            return {"success": True, "created": len(entities)}
            
        elif tool_name == "create_relations":
            relations = arguments.get("relations", [])
            memory_data.setdefault("relations", [])
            for relation in relations:
                # Check if relation already exists
                existing = any(
                    r["from"] == relation["from"] and 
                    r["to"] == relation["to"] and 
                    r["relationType"] == relation["relationType"]
                    for r in memory_data["relations"]
                )
                if not existing:
                    memory_data["relations"].append(relation)
            self._save_memory(memory_data)
            return {"success": True, "created": len(relations)}
            
        elif tool_name == "add_observations":
            observations = arguments.get("observations", [])
            entities = memory_data.get("entities", {})
            for obs in observations:
                entity_name = obs["entityName"]
                if entity_name in entities:
                    entities[entity_name].setdefault("observations", [])
                    entities[entity_name]["observations"].extend(obs["contents"])
            self._save_memory(memory_data)
            return {"success": True, "added": len(observations)}
            
        elif tool_name == "search_nodes":
            query = arguments.get("query", "").lower()
            entities = memory_data.get("entities", {})
            results = []
            
            for entity_id, entity in entities.items():
                # Search in entity name, type, and observations
                searchable_text = f"{entity_id} {entity.get('entityType', '')} {' '.join(entity.get('observations', []))}"
                if query in searchable_text.lower():
                    results.append(entity)
            
            return {"results": results}
            
        elif tool_name == "read_graph":
            return memory_data
            
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    
    def _load_memory(self) -> Dict[str, Any]:
        """Load memory from the JSONL file"""
        if not os.path.exists(self.memory_path):
            return {"entities": {}, "relations": []}
        
        try:
            with open(self.memory_path, 'r') as f:
                # Read all lines and parse the last complete state
                lines = f.readlines()
                if lines:
                    return json.loads(lines[-1])
                return {"entities": {}, "relations": []}
        except Exception as e:
            logger.error(f"Failed to load memory: {e}")
            return {"entities": {}, "relations": []}
    
    def _save_memory(self, data: Dict[str, Any]):
        """Save memory to the JSONL file"""
        try:
            with open(self.memory_path, 'a') as f:
                f.write(json.dumps(data) + '\n')
        except Exception as e:
            logger.error(f"Failed to save memory: {e}")
    
    def create_patient_entities(self, patient_id: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create patient entities in the MCP knowledge graph"""
        entities = []
        
        # Create patient entity
        patient_entity = MCPEntity(
            name=f"patient_{patient_id}",
            entityType="person",
            observations=[
                f"Age: {patient_data.get('age', 'unknown')}",
                f"Gender: {patient_data.get('gender', 'unknown')}",
                f"Trauma type: {patient_data.get('trauma_type', 'unknown')}",
                f"Baseline SUD: {patient_data.get('baseline_sud', 'unknown')}",
                f"PCL-5 score: {sum(patient_data.get('pcl5', []))}",
                f"PHQ-9 score: {sum(patient_data.get('phq9', []))}"
            ]
        )
        entities.append(asdict(patient_entity))
        
        # Create symptom entities
        for symptom in patient_data.get("ptsd_symptoms", []):
            symptom_entity = MCPEntity(
                name=f"symptom_{symptom.lower().replace(' ', '_')}",
                entityType="symptom",
                observations=[f"PTSD symptom: {symptom}"]
            )
            entities.append(asdict(symptom_entity))
        
        # Create trigger entities
        for trigger in patient_data.get("triggers", []):
            trigger_name = trigger.get("name", "") if isinstance(trigger, dict) else str(trigger)
            trigger_entity = MCPEntity(
                name=f"trigger_{trigger_name.lower().replace(' ', '_')}",
                entityType="trigger",
                observations=[f"Trauma trigger: {trigger_name}"]
            )
            entities.append(asdict(trigger_entity))
        
        return self._call_mcp_tool("create_entities", {"entities": entities})
    
    def create_patient_relations(self, patient_id: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create relationships between patient and their symptoms/triggers"""
        relations = []
        
        # Patient-symptom relationships
        for symptom in patient_data.get("ptsd_symptoms", []):
            relation = MCPRelation(
                from_entity=f"patient_{patient_id}",
                to=f"symptom_{symptom.lower().replace(' ', '_')}",
                relationType="experiences"
            )
            relations.append({
                "from": relation.from_entity,
                "to": relation.to,
                "relationType": relation.relationType
            })
        
        # Patient-trigger relationships
        for trigger in patient_data.get("triggers", []):
            trigger_name = trigger.get("name", "") if isinstance(trigger, dict) else str(trigger)
            relation = MCPRelation(
                from_entity=f"patient_{patient_id}",
                to=f"trigger_{trigger_name.lower().replace(' ', '_')}",
                relationType="triggered_by"
            )
            relations.append({
                "from": relation.from_entity,
                "to": relation.to,
                "relationType": relation.relationType
            })
        
        return self._call_mcp_tool("create_relations", {"relations": relations})
    
    def add_session_memory(self, patient_id: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add session observations to patient entity"""
        session_observations = [
            f"Session on {datetime.utcnow().strftime('%Y-%m-%d')}: {session_data.get('type', 'therapy')}",
            f"Initial SUD: {session_data.get('initial_sud', 'unknown')}",
            f"Final SUD: {session_data.get('final_sud', 'unknown')}"
        ]
        
        if session_data.get("initial_sud") and session_data.get("final_sud"):
            reduction = session_data["initial_sud"] - session_data["final_sud"]
            session_observations.append(f"SUD reduction: {reduction}")
        
        if session_data.get("notes"):
            session_observations.append(f"Notes: {session_data['notes']}")
        
        observations = [{
            "entityName": f"patient_{patient_id}",
            "contents": session_observations
        }]
        
        return self._call_mcp_tool("add_observations", {"observations": observations})
    
    def search_patient_memory(self, query: str) -> Dict[str, Any]:
        """Search the knowledge graph for relevant patient information"""
        return self._call_mcp_tool("search_nodes", {"query": query})
    
    def get_patient_context(self, patient_id: str) -> Dict[str, Any]:
        """Get all context for a specific patient"""
        # Search for patient-related entities
        patient_results = self.search_patient_memory(f"patient_{patient_id}")
        
        # Get the full graph to find relationships
        full_graph = self._call_mcp_tool("read_graph", {})
        
        # Filter for patient-related information
        patient_context = {
            "patient_entities": [],
            "related_entities": [],
            "relationships": [],
            "session_history": []
        }
        
        entities = full_graph.get("entities", {})
        relations = full_graph.get("relations", [])
        
        # Find patient entity and related entities
        for entity_id, entity in entities.items():
            if entity_id.startswith(f"patient_{patient_id}"):
                patient_context["patient_entities"].append(entity)
                
                # Extract session history from observations
                for obs in entity.get("observations", []):
                    if "Session on" in obs:
                        patient_context["session_history"].append(obs)
            
            elif any(rel["from"] == f"patient_{patient_id}" or rel["to"] == f"patient_{patient_id}" 
                    for rel in relations if rel["from"] == entity_id or rel["to"] == entity_id):
                patient_context["related_entities"].append(entity)
        
        # Find relationships involving the patient
        patient_context["relationships"] = [
            rel for rel in relations 
            if rel["from"].startswith(f"patient_{patient_id}") or rel["to"].startswith(f"patient_{patient_id}")
        ]
        
        return patient_context
    
    def get_similar_patients(self, patient_id: str, similarity_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find patients with similar symptoms or triggers"""
        target_context = self.get_patient_context(patient_id)
        target_symptoms = [
            entity["name"] for entity in target_context["related_entities"]
            if entity.get("entityType") == "symptom"
        ]
        target_triggers = [
            entity["name"] for entity in target_context["related_entities"]
            if entity.get("entityType") == "trigger"
        ]
        
        # Get all patients
        all_entities = self._call_mcp_tool("read_graph", {}).get("entities", {})
        similar_patients = []
        
        for entity_id, entity in all_entities.items():
            if entity_id.startswith("patient_") and entity_id != f"patient_{patient_id}":
                other_patient_id = entity_id.replace("patient_", "")
                other_context = self.get_patient_context(other_patient_id)
                
                other_symptoms = [
                    e["name"] for e in other_context["related_entities"]
                    if e.get("entityType") == "symptom"
                ]
                other_triggers = [
                    e["name"] for e in other_context["related_entities"]
                    if e.get("entityType") == "trigger"
                ]
                
                # Calculate similarity
                symptom_overlap = len(set(target_symptoms) & set(other_symptoms))
                trigger_overlap = len(set(target_triggers) & set(other_triggers))
                total_overlap = symptom_overlap + trigger_overlap
                total_unique = len(set(target_symptoms + target_triggers + other_symptoms + other_triggers))
                
                similarity = total_overlap / total_unique if total_unique > 0 else 0
                
                if similarity >= similarity_threshold:
                    similar_patients.append({
                        "patient_id": other_patient_id,
                        "similarity_score": similarity,
                        "shared_symptoms": list(set(target_symptoms) & set(other_symptoms)),
                        "shared_triggers": list(set(target_triggers) & set(other_triggers))
                    })
        
        return sorted(similar_patients, key=lambda x: x["similarity_score"], reverse=True)

# Global MCP client instance
mcp_client = MCPKnowledgeGraphClient() 