 #!/usr/bin/env python3
"""
Setup script for MCP Knowledge Graph integration
Installs dependencies and configures the MCP Knowledge Graph tool
"""

import subprocess
import sys
import os
import json
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return None

def check_node_npm():
    """Check if Node.js and npm are installed"""
    print("🔍 Checking Node.js and npm installation...")
    
    node_version = run_command("node --version", "Checking Node.js version")
    npm_version = run_command("npm --version", "Checking npm version")
    
    if node_version and npm_version:
        print(f"✅ Node.js version: {node_version.strip()}")
        print(f"✅ npm version: {npm_version.strip()}")
        return True
    else:
        print("❌ Node.js and/or npm not found. Please install Node.js from https://nodejs.org/")
        return False

def install_python_dependencies():
    """Install Python dependencies"""
    print("🔄 Installing Python dependencies...")
    
    # Install requirements
    result = run_command(f"{sys.executable} -m pip install -r requirements.txt", 
                        "Installing Python requirements")
    
    if result is not None:
        print("✅ Python dependencies installed successfully")
        return True
    else:
        print("❌ Failed to install Python dependencies")
        return False

def test_mcp_tool():
    """Test the MCP Knowledge Graph tool"""
    print("🔄 Testing MCP Knowledge Graph tool...")
    
    # Test npx command
    result = run_command("npx --version", "Testing npx")
    if result is None:
        return False
    
    # Test MCP tool installation (this will install it if not present)
    result = run_command("npx -y mcp-knowledge-graph --help", 
                        "Testing MCP Knowledge Graph tool")
    
    if result is not None:
        print("✅ MCP Knowledge Graph tool is working")
        return True
    else:
        print("❌ MCP Knowledge Graph tool test failed")
        return False

def create_data_directories():
    """Create necessary data directories"""
    print("🔄 Creating data directories...")
    
    directories = [
        "data",
        "data/knowledge_graph",
        "data/mcp_memory"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {directory}")

def create_mcp_config():
    """Create MCP configuration file"""
    print("🔄 Creating MCP configuration...")
    
    config = {
        "mcpServers": {
            "ptsd-memory": {
                "command": "npx",
                "args": [
                    "-y",
                    "mcp-knowledge-graph",
                    "--memory-path",
                    os.path.join(os.getcwd(), "data", "mcp_memory", "ptsd_memory.jsonl")
                ],
                "autoapprove": [
                    "create_entities",
                    "create_relations",
                    "add_observations",
                    "delete_entities",
                    "delete_observations",
                    "delete_relations",
                    "read_graph",
                    "search_nodes",
                    "open_nodes"
                ]
            }
        }
    }
    
    config_path = "mcp_config.json"
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ MCP configuration created: {config_path}")
    return config_path

def test_integration():
    """Test the integration with a simple example"""
    print("🔄 Testing MCP integration...")
    
    try:
        from services.mcp_knowledge_graph_client import mcp_client
        from services.mcp_integration import mcp_provider
        
        # Test creating a simple patient entity
        test_patient_data = {
            "name": "Test Patient",
            "age": 30,
            "gender": "female",
            "trauma_type": "combat",
            "ptsd_symptoms": ["nightmares", "flashbacks"],
            "triggers": [{"name": "loud noises", "sud": 8}]
        }
        
        result = mcp_client.create_patient_entities("test_patient_001", test_patient_data)
        
        if result.get("success"):
            print("✅ MCP integration test passed")
            
            # Clean up test data
            print("🔄 Cleaning up test data...")
            return True
        else:
            print(f"❌ MCP integration test failed: {result}")
            return False
            
    except Exception as e:
        print(f"❌ MCP integration test failed with exception: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up MCP Knowledge Graph integration for PTSD Therapy System")
    print("=" * 70)
    
    # Check prerequisites
    if not check_node_npm():
        print("\n❌ Setup failed: Node.js and npm are required")
        sys.exit(1)
    
    # Install Python dependencies
    if not install_python_dependencies():
        print("\n❌ Setup failed: Could not install Python dependencies")
        sys.exit(1)
    
    # Create directories
    create_data_directories()
    
    # Test MCP tool
    if not test_mcp_tool():
        print("\n❌ Setup failed: MCP Knowledge Graph tool is not working")
        sys.exit(1)
    
    # Create configuration
    config_path = create_mcp_config()
    
    # Test integration
    if not test_integration():
        print("\n⚠️  Setup completed but integration test failed")
        print("You may need to debug the integration manually")
    
    print("\n" + "=" * 70)
    print("🎉 MCP Knowledge Graph setup completed successfully!")
    print("\nNext steps:")
    print("1. Start your Flask application: python app.py")
    print("2. Visit the MCP Memory dashboard: http://localhost:5000/dashboard/mcp-memory")
    print("3. Initialize patients in the MCP Knowledge Graph using the API endpoints")
    print(f"\nMCP Configuration file created: {config_path}")
    print("Memory files will be stored in: data/mcp_memory/")
    
    print("\nAPI Endpoints available:")
    print("- POST /api/mcp/initialize-patient")
    print("- GET /api/mcp/patient-context/<patient_id>")
    print("- POST /api/mcp/session-memory")
    print("- POST /api/mcp/search")
    print("- GET /dashboard/mcp-memory")

if __name__ == "__main__":
    main() 