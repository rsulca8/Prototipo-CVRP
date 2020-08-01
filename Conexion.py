from flask import Flask, request,jsonify,make_response,json
from flask_restful import Resource, Api
from flask_cors import CORS
from CVRP import CVRP
from Solucion import Solucion
app = Flask(__name__)
api = Api(app)
CORS(app)
matrices = {}

@app.route("/get/<matriz_id>")
def get(matriz_id):
    print("recibió", matriz_id)
    return matriz_id


@app.route('/post', methods = ['POST'])
def post():   
    datos = request.form['data']
    nroVehiculos = request.form['nroVehiculos']
    print(nroVehiculos)
    response = app.response_class(
        response=datos,
        status=200,
        mimetype='application/json'
    )

    return datos,200



if __name__ == '__main__':
    app.run(debug=True)