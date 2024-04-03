from flask import Flask, render_template, request, make_response


app = Flask(__name__)

@app.route('/')
def hello_world():
    user_option = "0"
    user_option = request.cookies.get('user_option')
    return render_template('index.html', user_option=user_option)

@app.route('/setTheme', methods=['POST'])
def setTheme():
    data = request.json
    resp = make_response('Option setted')
    resp.set_cookie('user_option', str(int(data)))
    return resp

if __name__ == '__main__':
    app.run(debug=True)