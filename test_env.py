import os
from dotenv import load_dotenv
load_dotenv(override=True)
print("URI:", os.getenv('NEO4J_URI'))
print("USER:", os.getenv('NEO4J_USER'))
print("PASS:", os.getenv('NEO4J_PASSWORD'))

from neo4j import GraphDatabase
try:
    driver = GraphDatabase.driver(os.getenv('NEO4J_URI'), auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')))
    driver.verify_connectivity()
    print('Neo4j connected.')
except Exception as e:
    print('Neo4j not available:', e)
