import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import * as bycryptjs from 'bcryptjs'

import { RegisterUserDto, CreateUserDto, UpdateAuthDto, LoginDto } from './dto';

import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload';
import { LoginResponse } from './interfaces/login-response';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) 
    private userModel: Model<User>,
    private jwtService: JwtService
    
  ){}

  async create(createUserDto: CreateUserDto):Promise<User> {
    
    try{
      // Desestructuración
      const { password, ...userData } = createUserDto;

      const newUser = new this.userModel({
        password: bycryptjs.hashSync( password, 10 ),
        ...userData //Esparcimos toda la data que falta del nuevo usuario
      })


      // const newUser = new this.userModel( createUserDto );
      await newUser.save();

      // Colocamos el guión bajo para renombrarlo simplemente, ya que tenemos una
      // - desestructuracio nde password arriba. Bien lo que hacemos es extraer toda
      // - la info del usuario sin la contraseña
      const { password:_, ...user } = newUser.toJSON();

      return user;
     
    }catch(error){
      if(error.code === 11000){
        throw new BadRequestException(`${createUserDto.email} already exits!`);
      }
      throw new InternalServerErrorException('Something terrible happend!!!');
    }
  }

  async register(registerUserDto: RegisterUserDto):Promise<LoginResponse>{


    // Acepta el registerUserDto, ya que cumple con la estructura de lo que es un CreateUserDto
    const user = await this.create(registerUserDto);
    console.log({user})
    // Filtrar el password
    // const { password:_, ...rest } = user;

    return {
      user: user,
      token: this.getJwtToken({ id:user._id })
    }

  }

  async login(loginDto: LoginDto):Promise<LoginResponse>{
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if(!user){
      throw new UnauthorizedException('Not valid credentials - email');
    }
    if(!bycryptjs.compareSync(password, user.password)){
      throw new UnauthorizedException('Not valid credentials - password');
    }

    const { password:_, ...rest } = user.toJSON();

    return {
      user: rest,
      token: this.getJwtToken({ id:user.id })
    } 
  }


  findAll():Promise<User[]> {
    return this.userModel.find();
  }

  async findUserById(id: string){
    const user = await this.userModel.findById(id);
    const { password, ...rest } = user.toJSON();
    return rest;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  getJwtToken(payload: JwtPayload){
    const token = this.jwtService.sign(payload);
    return token;
  }
}
